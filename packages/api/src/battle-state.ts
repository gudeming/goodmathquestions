import { redis } from "./redis";

// ============================================================
// TYPES
// ============================================================

export type BattlePhase =
  | "ANSWERING"
  | "ACTING"
  | "COUNTER_CHOICE" // defender picks counter or active-attack after absorbing an attack
  | "RESOLVING"
  | "FINISHED";

export type ActionChosen =
  | "ATTACK_50"
  | "ATTACK_80"
  | "ATTACK_100"
  | "HOLD"
  | "COUNTER"
  | "ACTIVE_ATTACK"
  | "FAILED_ATTACK" // display-only label in summaries
  | "NONE";

export interface BattleParticipantState {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  hp: number;
  battleXp: number;      // accumulated power — persists between rounds until spent
  hasAnswered: boolean;
  hasActed: boolean;
  actionChosen: ActionChosen;
  attackPowerUsed: number; // power committed to the current attack (for display)
  lastSeenAt: number;      // epoch ms — for abandon detection
  xpStaked: number;        // snapshot of entry fee at join time
  xpChange?: number;       // set after battle ends: actual XP won (+) or lost (-)
}

export interface BattleQuestionState {
  promptEn: string;
  promptZh: string;
  difficulty: string;
  category: string;
  answer: string; // stored server-side only — never sent to client
  token: string;
}

export interface PendingCounter {
  defenderId: string;
  attackerId: string;
  defenderRemainingPower: number; // power remaining after absorbing the attack
  startedAt: number;              // epoch ms — for timeout detection
}

export interface BattleRedisState {
  battleId: string;
  status: "WAITING" | "COUNTDOWN" | "ACTIVE" | "FINISHED" | "ABANDONED";
  phase: BattlePhase;
  currentRound: number;
  roundStartedAt: number; // epoch ms
  roundTimeoutSec: number;
  participants: Record<string, BattleParticipantState>; // keyed by userId
  currentQuestion: Omit<BattleQuestionState, "answer"> | null;
  lastRoundSummary: RoundSummary | null;
  pendingCounter: PendingCounter | null; // set when an attack is absorbed by a defender
  winnerId: string | null;
  countdownStartedAt: number | null;
}

export interface RoundSummary {
  round: number;
  participants: Record<
    string,
    {
      isCorrect: boolean;
      battleXpGained: number;
      action: string;
      damageDealt: number;
      damageReceived: number;
      hpAfter: number;
    }
  >;
}

// ============================================================
// CONSTANTS
// ============================================================

export const BATTLE_STATE_TTL = 7200; // 2 hours
export const ENTRY_FEE_XP = 1000;
export const STARTING_HP = 5000;
export const ABANDON_TIMEOUT_MS = 60_000;
export const COUNTER_TIMEOUT_MS = 15_000; // 15s to choose counter action

// Battle XP per correct answer (accumulates as defense / attack resource)
const DIFFICULTY_BASE: Record<string, number> = {
  EASY: 300,
  MEDIUM: 600,
  HARD: 1000,
  CHALLENGE: 1500,
};

// What fraction of battleXp each attack choice commits
const ATTACK_PERCENT: Record<string, number> = {
  ATTACK_50: 0.5,
  ATTACK_80: 0.8,
  ATTACK_100: 1.0,
};

// ============================================================
// BATTLE XP FORMULA
// ============================================================

export function calcBattleXp(
  isCorrect: boolean,
  difficulty: string,
  responseTimeMs: number,
  roundTimeoutSec: number
): number {
  if (!isCorrect) return 0;
  const base = DIFFICULTY_BASE[difficulty] ?? DIFFICULTY_BASE.MEDIUM;
  const maxMs = roundTimeoutSec * 1000;
  const speedRatio = Math.max(0, 1 - responseTimeMs / maxMs);
  return Math.round(base * (0.6 + 0.4 * speedRatio));
}

// ============================================================
// ROUND RESOLUTION — ACTING phase
// ============================================================

function isAttackAction(action: ActionChosen | string): boolean {
  return action === "ATTACK_50" || action === "ATTACK_80" || action === "ATTACK_100";
}

/**
 * Resolve combat when both players have chosen their ACTING-phase action.
 *
 * New mechanics
 * ─────────────
 * • battleXp persists between rounds (not reset each round)
 * • Attack choices: ATTACK_50 / ATTACK_80 / ATTACK_100 commit that % of current power
 * • HOLD: keeps all power as passive defense, no direct damage this exchange
 * • If attacker's committed power > defender's accumulated power:
 *     HP damage = (committed - defender) × 3; both sides spend their power
 * • If attacker's committed power ≤ defender's accumulated power:
 *     Attacker loses committed power; defender retains (defender − committed)
 *     → pendingCounter is returned; state.phase should be set to COUNTER_CHOICE
 * • If both attack: higher committed wins; both spend committed power
 * • If both HOLD: no damage, XP accumulates
 *
 * Returns hasPendingCounter = true when the round is NOT yet fully resolved.
 */
export function resolveRound(state: BattleRedisState): {
  summary: RoundSummary | null;
  finished: boolean;
  winnerId: string | null;
  hasPendingCounter: boolean;
} {
  const pList = Object.values(state.participants);
  if (pList.length !== 2) {
    throw new Error("resolveRound requires exactly 2 participants");
  }

  const [a, b] = pList as [BattleParticipantState, BattleParticipantState];

  const aAttacking = isAttackAction(a.actionChosen);
  const bAttacking = isAttackAction(b.actionChosen);

  const aCommit = aAttacking
    ? Math.floor(a.battleXp * (ATTACK_PERCENT[a.actionChosen] ?? 1))
    : 0;
  const bCommit = bAttacking
    ? Math.floor(b.battleXp * (ATTACK_PERCENT[b.actionChosen] ?? 1))
    : 0;

  a.attackPowerUsed = aCommit;
  b.attackPowerUsed = bCommit;

  let aDamageDealt = 0; // HP damage A inflicts on B
  let bDamageDealt = 0; // HP damage B inflicts on A
  let pendingCounter: PendingCounter | null = null;

  if (aAttacking && bAttacking) {
    // Both commit power — higher wins
    a.battleXp -= aCommit;
    b.battleXp -= bCommit;
    if (aCommit > bCommit) {
      aDamageDealt = (aCommit - bCommit) * 3;
    } else if (bCommit > aCommit) {
      bDamageDealt = (bCommit - aCommit) * 3;
    }
    // equal → no HP damage, both still spent their power
  } else if (aAttacking) {
    // A attacks, B's battleXp is their passive defense
    a.battleXp -= aCommit;
    if (aCommit > b.battleXp) {
      aDamageDealt = (aCommit - b.battleXp) * 3;
      b.battleXp = 0;
    } else {
      const remaining = b.battleXp - aCommit;
      b.battleXp = remaining;
      pendingCounter = {
        defenderId: b.userId,
        attackerId: a.userId,
        defenderRemainingPower: remaining,
        startedAt: Date.now(),
      };
    }
  } else if (bAttacking) {
    // B attacks, A's battleXp is their passive defense
    b.battleXp -= bCommit;
    if (bCommit > a.battleXp) {
      bDamageDealt = (bCommit - a.battleXp) * 3;
      a.battleXp = 0;
    } else {
      const remaining = a.battleXp - bCommit;
      a.battleXp = remaining;
      pendingCounter = {
        defenderId: a.userId,
        attackerId: b.userId,
        defenderRemainingPower: remaining,
        startedAt: Date.now(),
      };
    }
  }
  // Both HOLD → no action, XP keeps accumulating

  // Apply HP damage
  a.hp = Math.max(0, a.hp - bDamageDealt);
  b.hp = Math.max(0, b.hp - aDamageDealt);

  // Reset action flags (answers reset only when the next question starts)
  a.hasActed = false;
  a.actionChosen = "NONE";
  b.hasActed = false;
  b.actionChosen = "NONE";

  state.pendingCounter = pendingCounter;

  // Win check
  const aAlive = a.hp > 0;
  const bAlive = b.hp > 0;
  let finished = false;
  let winnerId: string | null = null;

  if (!aAlive || !bAlive) {
    finished = true;
    if (aAlive && !bAlive) winnerId = a.userId;
    else if (bAlive && !aAlive) winnerId = b.userId;
    else winnerId = a.attackPowerUsed >= b.attackPowerUsed ? a.userId : b.userId;
    state.status = "FINISHED";
    state.winnerId = winnerId;
  }

  if (!pendingCounter) {
    // Full round complete — build summary, reset answering state, advance round
    const summary: RoundSummary = {
      round: state.currentRound,
      participants: {
        [a.userId]: {
          isCorrect: a.hasAnswered,
          battleXpGained: aCommit,
          action: a.attackPowerUsed > 0 ? a.actionChosen || "ATTACK_100" : "HOLD",
          damageDealt: aDamageDealt,
          damageReceived: bDamageDealt,
          hpAfter: a.hp,
        },
        [b.userId]: {
          isCorrect: b.hasAnswered,
          battleXpGained: bCommit,
          action: b.attackPowerUsed > 0 ? b.actionChosen || "ATTACK_100" : "HOLD",
          damageDealt: bDamageDealt,
          damageReceived: aDamageDealt,
          hpAfter: b.hp,
        },
      },
    };
    state.lastRoundSummary = summary;
    a.hasAnswered = false;
    a.attackPowerUsed = 0;
    b.hasAnswered = false;
    b.attackPowerUsed = 0;
    state.currentRound += 1;
    return { summary, finished, winnerId, hasPendingCounter: false };
  } else {
    // Counter choice pending — save partial result but don't advance round yet
    return { summary: null, finished, winnerId, hasPendingCounter: true };
  }
}

// ============================================================
// COUNTER RESOLUTION — COUNTER_CHOICE phase
// ============================================================

/**
 * Resolve the defender's counter-attack choice after absorbing an attack.
 *
 * COUNTER       → guaranteed damage = defenderRemainingPower × 2 (bypasses offense)
 * ACTIVE_ATTACK → damage = (defenderRemainingPower − attackerCurrentPower) × 3
 *                 (can be 0 if attacker has rebuilt power somehow, min 0)
 *
 * Defender always spends their remaining power regardless of choice.
 */
export function resolveCounter(
  state: BattleRedisState,
  counterAction: "COUNTER" | "ACTIVE_ATTACK"
): { summary: RoundSummary; finished: boolean; winnerId: string | null } {
  const pc = state.pendingCounter!;
  const defender = state.participants[pc.defenderId]!;
  const attacker = state.participants[pc.attackerId]!;

  let damageToAttacker: number;
  if (counterAction === "COUNTER") {
    // Guaranteed — ignores attacker's remaining power
    damageToAttacker = pc.defenderRemainingPower * 2;
  } else {
    // Active attack: (defender remaining − attacker current) × 3, min 0
    damageToAttacker = Math.max(0, (pc.defenderRemainingPower - attacker.battleXp) * 3);
  }

  attacker.hp = Math.max(0, attacker.hp - damageToAttacker);
  defender.battleXp = 0; // counter/active-attack spends the remaining power

  const summary: RoundSummary = {
    round: state.currentRound,
    participants: {
      [defender.userId]: {
        isCorrect: true,
        battleXpGained: pc.defenderRemainingPower,
        action: counterAction,
        damageDealt: damageToAttacker,
        damageReceived: 0,
        hpAfter: defender.hp,
      },
      [attacker.userId]: {
        isCorrect: false,
        battleXpGained: 0,
        action: "FAILED_ATTACK",
        damageDealt: 0,
        damageReceived: damageToAttacker,
        hpAfter: attacker.hp,
      },
    },
  };

  state.lastRoundSummary = summary;
  state.pendingCounter = null;

  // Reset both players for next round
  for (const p of Object.values(state.participants)) {
    p.hasAnswered = false;
    p.hasActed = false;
    p.actionChosen = "NONE";
    p.attackPowerUsed = 0;
  }
  state.currentRound += 1;

  // Win check
  const [p1, p2] = Object.values(state.participants) as [
    BattleParticipantState,
    BattleParticipantState
  ];
  const p1Alive = p1.hp > 0;
  const p2Alive = p2.hp > 0;
  let finished = false;
  let winnerId: string | null = null;

  if (!p1Alive || !p2Alive) {
    finished = true;
    if (p1Alive && !p2Alive) winnerId = p1.userId;
    else if (p2Alive && !p1Alive) winnerId = p2.userId;
    else winnerId = pc.defenderId; // both dead → defender wins (dealt final blow)
    state.status = "FINISHED";
    state.winnerId = winnerId;
  }

  return { summary, finished, winnerId };
}

// ============================================================
// REDIS HELPERS
// ============================================================

function battleKey(battleId: string): string {
  return `battle:${battleId}:state`;
}

function roundLockKey(battleId: string, round: number): string {
  return `battle:${battleId}:round:${round}:lock`;
}

function questionKey(battleId: string, round: number): string {
  return `battle:${battleId}:round:${round}:question`;
}

export async function readBattleState(
  battleId: string
): Promise<BattleRedisState | null> {
  try {
    const raw = await redis.get(battleKey(battleId));
    if (!raw) return null;
    return JSON.parse(raw) as BattleRedisState;
  } catch {
    return null;
  }
}

export async function writeBattleState(state: BattleRedisState): Promise<void> {
  try {
    await redis.set(
      battleKey(state.battleId),
      JSON.stringify(state),
      "EX",
      BATTLE_STATE_TTL
    );
  } catch {
    // non-fatal
  }
}

export async function acquireRoundLock(
  battleId: string,
  round: number
): Promise<boolean> {
  try {
    const result = await redis.set(
      roundLockKey(battleId, round),
      "1",
      "EX",
      30,
      "NX"
    );
    return result === "OK";
  } catch {
    return true; // fail open
  }
}

export async function storeRoundQuestion(
  battleId: string,
  round: number,
  question: BattleQuestionState
): Promise<void> {
  try {
    await redis.set(
      questionKey(battleId, round),
      JSON.stringify(question),
      "EX",
      BATTLE_STATE_TTL
    );
  } catch {
    // non-fatal
  }
}

export async function getRoundQuestion(
  battleId: string,
  round: number
): Promise<BattleQuestionState | null> {
  try {
    const raw = await redis.get(questionKey(battleId, round));
    if (!raw) return null;
    return JSON.parse(raw) as BattleQuestionState;
  } catch {
    return null;
  }
}

export function generateInviteCode(): string {
  const words = [
    "ZAP", "POW", "ACE", "GEM", "FLY", "WIN", "TOP", "MAX",
    "PRO", "GOD", "ICE", "SUN", "SKY", "RAY", "OAK", "BIG",
  ];
  const word = words[Math.floor(Math.random() * words.length)]!;
  const num = Math.floor(Math.random() * 90) + 10;
  return `${word}-${num}`;
}

export function isAbandoned(participant: BattleParticipantState): boolean {
  return Date.now() - participant.lastSeenAt > ABANDON_TIMEOUT_MS;
}
