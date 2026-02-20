import { redis } from "./redis";

// ============================================================
// TYPES
// ============================================================

export type BattlePhase =
  | "ANSWERING"
  | "ACTING"
  | "COUNTER_CHOICE" // 2-player only: defender picks counter after absorbing an attack
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

export interface KillRecord {
  killedUserId: string;
  killerUserId: string | null; // null = environment kill (timeout/forfeit)
  xpStaked: number;            // the victim's entry fee that goes to the killer
}

export interface BattleParticipantState {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  hp: number;
  battleXp: number;          // accumulated power — persists between rounds until spent
  hasAnswered: boolean;
  hasActed: boolean;
  actionChosen: ActionChosen;
  attackPowerUsed: number;   // power committed to the current attack (for display)
  targetUserId?: string;     // multi-player: who this player is targeting in ACTING phase
  isEliminated: boolean;     // true when HP hits 0 (stays in participants for history)
  lastSeenAt: number;        // epoch ms — for abandon detection
  xpStaked: number;          // snapshot of entry fee at join time
  xpChange?: number;         // set after battle ends: actual XP won (+) or lost (-)
  lastAnswerCorrect: boolean | null;
}

export interface BattleQuestionState {
  promptEn: string;
  promptZh: string;
  difficulty: string;
  category: string;
  answer: string; // stored server-side only — never sent to client
  token: string;
  dbId?: string;  // DB question id — present for DB questions, absent for adaptive
}

export interface PendingCounter {
  defenderId: string;
  attackerId: string;
  defenderRemainingPower: number;
  startedAt: number;
}

export interface BattleRedisState {
  battleId: string;
  status: "WAITING" | "COUNTDOWN" | "ACTIVE" | "FINISHED" | "ABANDONED";
  phase: BattlePhase;
  currentRound: number;
  roundStartedAt: number; // epoch ms
  roundTimeoutSec: number;
  maxPlayers: number;     // 2–6; determines starting HP and winner bonus
  participants: Record<string, BattleParticipantState>; // keyed by userId
  currentQuestion: Omit<BattleQuestionState, "answer"> | null;
  lastRoundSummary: RoundSummary | null;
  pendingCounter: PendingCounter | null; // 2-player only
  kills: KillRecord[];                   // multi-player kill tracking
  winnerId: string | null;
  countdownStartedAt: number | null;
  usedQuestionIds: string[];
  waitingExpiresAt: number | null;
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
      isEliminated?: boolean; // NEW: whether this player was eliminated this round
      killedBy?: string;      // NEW: userId of killer if eliminated
    }
  >;
  newKills?: KillRecord[]; // kills that happened in this round
}

// ============================================================
// CONSTANTS
// ============================================================

export const BATTLE_STATE_TTL = 7200;          // 2 hours
export const ENTRY_FEE_XP = 1000;
export const HP_PER_PLAYER = 1000;             // starting HP = maxPlayers × HP_PER_PLAYER
export const WINNER_BONUS_XP_PER_PLAYER = 1000; // system bonus = maxPlayers × this
export const ABANDON_TIMEOUT_MS = 60_000;
export const COUNTER_TIMEOUT_MS = 15_000;
export const QUEUE_ENTRY_TTL_MS = 300_000;     // 5 min in RANDOM queue

/** Compute starting HP for a battle with the given player count */
export function startingHp(maxPlayers: number): number {
  return Math.max(2, Math.min(6, maxPlayers)) * HP_PER_PLAYER;
}

// Battle XP per correct answer
const DIFFICULTY_BASE: Record<string, number> = {
  EASY: 300,
  MEDIUM: 600,
  HARD: 1000,
  CHALLENGE: 1500,
};

// What fraction of battleXp each attack choice commits
export const ATTACK_PERCENT: Record<string, number> = {
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
// HELPERS
// ============================================================

export function isAttackAction(action: ActionChosen | string): boolean {
  return action === "ATTACK_50" || action === "ATTACK_80" || action === "ATTACK_100";
}

export function isAbandoned(participant: BattleParticipantState): boolean {
  return Date.now() - participant.lastSeenAt > ABANDON_TIMEOUT_MS;
}

/** Returns alive (non-eliminated) participants */
export function alivePlayers(
  state: BattleRedisState
): BattleParticipantState[] {
  return Object.values(state.participants).filter((p) => !p.isEliminated);
}

// ============================================================
// ROUND RESOLUTION — 2-player (ACTING phase)
// ============================================================

/**
 * Resolve combat when both players have chosen their ACTING-phase action.
 * Used exclusively for 2-player (maxPlayers === 2) battles where
 * COUNTER_CHOICE mechanics are available.
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

  let aDamageDealt = 0;
  let bDamageDealt = 0;
  let pendingCounter: PendingCounter | null = null;

  if (aAttacking && bAttacking) {
    a.battleXp -= aCommit;
    b.battleXp -= bCommit;
    if (aCommit > bCommit) {
      aDamageDealt = (aCommit - bCommit) * 3;
    } else if (bCommit > aCommit) {
      bDamageDealt = (bCommit - aCommit) * 3;
    }
  } else if (aAttacking) {
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

  a.hp = Math.max(0, a.hp - bDamageDealt);
  b.hp = Math.max(0, b.hp - aDamageDealt);

  a.hasActed = false;
  a.actionChosen = "NONE";
  b.hasActed = false;
  b.actionChosen = "NONE";

  state.pendingCounter = pendingCounter;

  const aAlive = a.hp > 0;
  const bAlive = b.hp > 0;
  let finished = false;
  let winnerId: string | null = null;

  if (!aAlive || !bAlive) {
    finished = true;
    if (!aAlive) a.isEliminated = true;
    if (!bAlive) b.isEliminated = true;
    if (aAlive && !bAlive) winnerId = a.userId;
    else if (bAlive && !aAlive) winnerId = b.userId;
    else winnerId = a.attackPowerUsed >= b.attackPowerUsed ? a.userId : b.userId;
    state.status = "FINISHED";
    state.winnerId = winnerId;
  }

  if (!pendingCounter) {
    const summary: RoundSummary = {
      round: state.currentRound,
      participants: {
        [a.userId]: {
          isCorrect: a.lastAnswerCorrect ?? false,
          battleXpGained: aCommit,
          action: a.attackPowerUsed > 0 ? a.actionChosen || "ATTACK_100" : "HOLD",
          damageDealt: aDamageDealt,
          damageReceived: bDamageDealt,
          hpAfter: a.hp,
          isEliminated: a.isEliminated,
        },
        [b.userId]: {
          isCorrect: b.lastAnswerCorrect ?? false,
          battleXpGained: bCommit,
          action: b.attackPowerUsed > 0 ? b.actionChosen || "ATTACK_100" : "HOLD",
          damageDealt: bDamageDealt,
          damageReceived: aDamageDealt,
          hpAfter: b.hp,
          isEliminated: b.isEliminated,
        },
      },
    };
    state.lastRoundSummary = summary;
    a.hasAnswered = false;
    a.attackPowerUsed = 0;
    a.lastAnswerCorrect = null;
    b.hasAnswered = false;
    b.attackPowerUsed = 0;
    b.lastAnswerCorrect = null;
    state.currentRound += 1;
    return { summary, finished, winnerId, hasPendingCounter: false };
  } else {
    return { summary: null, finished, winnerId, hasPendingCounter: true };
  }
}

// ============================================================
// ROUND RESOLUTION — multi-player (N ≥ 3 players, ACTING phase)
// ============================================================

/**
 * Resolve combat for 3–6 player battles.
 *
 * Each alive player has chosen:
 *   actionChosen: ATTACK_50/80/100 or HOLD
 *   targetUserId: which opponent to attack (auto-assigned if missing)
 *
 * Mechanics:
 *   - Attacks processed in decreasing commit order per target
 *   - Each attack: committed power vs target's current battleXp
 *     • committed > target.battleXp → damage = (committed − defense) × 3; target.battleXp = 0
 *     • committed ≤ target.battleXp → target absorbs (keeps remaining); NO counter in multi-player
 *   - Multiple players can target the same opponent (attacks resolved sequentially)
 *   - Player eliminated when hp ≤ 0; kill reward goes to the attacker who dealt the killing blow
 *   - Game ends when ≤ 1 survivor remains
 */
export function resolveMultiplayerRound(state: BattleRedisState): {
  summary: RoundSummary;
  finished: boolean;
  winnerId: string | null;
} {
  const allP = Object.values(state.participants);
  const alive = allP.filter((p) => !p.isEliminated);

  // Group attacks by target
  const incomingAttacks: Record<
    string,
    Array<{ commit: number; attackerId: string }>
  > = {};

  for (const attacker of alive) {
    if (!isAttackAction(attacker.actionChosen)) {
      attacker.attackPowerUsed = 0;
      continue;
    }

    // Resolve / validate target
    let targetId = attacker.targetUserId;
    const targetValid =
      targetId &&
      targetId !== attacker.userId &&
      state.participants[targetId] &&
      !state.participants[targetId]!.isEliminated;

    if (!targetValid) {
      // Auto-target: pick first alive opponent
      const fallback = alive.find((p) => p.userId !== attacker.userId);
      targetId = fallback?.userId;
    }
    if (!targetId) {
      attacker.attackPowerUsed = 0;
      continue;
    }

    const pct = ATTACK_PERCENT[attacker.actionChosen] ?? 1;
    const committed = Math.floor(attacker.battleXp * pct);
    attacker.battleXp -= committed;
    attacker.attackPowerUsed = committed;
    attacker.targetUserId = targetId; // normalize

    if (!incomingAttacks[targetId]) incomingAttacks[targetId] = [];
    incomingAttacks[targetId].push({ commit: committed, attackerId: attacker.userId });
  }

  // Track damage for summary
  const damageDealtMap: Record<string, number> = {};
  const damageReceivedMap: Record<string, number> = {};
  const roundKills: KillRecord[] = [];

  for (const [targetId, attacks] of Object.entries(incomingAttacks)) {
    const target = state.participants[targetId]!;
    // Sort: strongest first — more impactful hits land while target still has defense
    const sorted = [...attacks].sort((a, b) => b.commit - a.commit);

    for (const { commit, attackerId } of sorted) {
      if (target.isEliminated) break; // already dead from an earlier hit this round

      if (commit > target.battleXp) {
        const damage = (commit - target.battleXp) * 3;
        target.battleXp = 0;
        target.hp = Math.max(0, target.hp - damage);

        damageDealtMap[attackerId] = (damageDealtMap[attackerId] ?? 0) + damage;
        damageReceivedMap[targetId] = (damageReceivedMap[targetId] ?? 0) + damage;

        if (target.hp <= 0) {
          target.isEliminated = true;
          roundKills.push({
            killedUserId: targetId,
            killerUserId: attackerId,
            xpStaked: target.xpStaked,
          });
        }
      } else {
        // Attack absorbed — attacker already spent power, target keeps the difference
        target.battleXp -= commit;
        // No counter-attack in multi-player
      }
    }
  }

  // Append new kills
  state.kills = [...(state.kills ?? []), ...roundKills];

  // Win check (before resetting flags)
  const survivors = allP.filter((p) => !p.isEliminated);
  let finished = false;
  let winnerId: string | null = null;

  if (survivors.length <= 1) {
    finished = true;
    if (survivors.length === 1) {
      winnerId = survivors[0]!.userId;
    } else {
      // Simultaneous elimination — highest attack power this round wins
      winnerId =
        allP.reduce((best, p) =>
          (p.attackPowerUsed ?? 0) >= (best?.attackPowerUsed ?? 0) ? p : best
        ).userId ?? null;
      if (winnerId) state.participants[winnerId]!.isEliminated = false; // survivor
    }
    state.status = "FINISHED";
    state.winnerId = winnerId;
  }

  // Build round summary
  const summary: RoundSummary = {
    round: state.currentRound,
    participants: Object.fromEntries(
      allP.map((p) => [
        p.userId,
        {
          isCorrect: p.lastAnswerCorrect ?? false,
          battleXpGained: p.attackPowerUsed ?? 0,
          action:
            p.attackPowerUsed > 0
              ? p.actionChosen || "ATTACK_100"
              : "HOLD",
          damageDealt: damageDealtMap[p.userId] ?? 0,
          damageReceived: damageReceivedMap[p.userId] ?? 0,
          hpAfter: p.hp,
          isEliminated: p.isEliminated,
          killedBy:
            roundKills.find((k) => k.killedUserId === p.userId)
              ?.killerUserId ?? undefined,
        },
      ])
    ),
    newKills: roundKills.length > 0 ? roundKills : undefined,
  };
  state.lastRoundSummary = summary;
  state.pendingCounter = null;

  // Reset per-round flags for all players (alive or not — dead ones won't act anyway)
  for (const p of allP) {
    p.hasActed = false;
    p.hasAnswered = false;
    p.actionChosen = "NONE";
    p.attackPowerUsed = 0;
    p.lastAnswerCorrect = null;
    p.targetUserId = undefined;
  }
  state.currentRound += 1;

  return { summary, finished, winnerId };
}

// ============================================================
// COUNTER RESOLUTION — 2-player COUNTER_CHOICE phase
// ============================================================

/**
 * Resolve the defender's counter-attack choice after absorbing an attack.
 * Only used in 2-player battles.
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
    damageToAttacker = pc.defenderRemainingPower * 2;
  } else {
    damageToAttacker = Math.max(
      0,
      (pc.defenderRemainingPower - attacker.battleXp) * 3
    );
  }

  attacker.hp = Math.max(0, attacker.hp - damageToAttacker);
  defender.battleXp = 0;

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

  for (const p of Object.values(state.participants)) {
    p.hasAnswered = false;
    p.hasActed = false;
    p.actionChosen = "NONE";
    p.attackPowerUsed = 0;
    p.lastAnswerCorrect = null;
  }
  state.currentRound += 1;

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
    if (!p1Alive) p1.isEliminated = true;
    if (!p2Alive) p2.isEliminated = true;
    if (p1Alive && !p2Alive) winnerId = p1.userId;
    else if (p2Alive && !p1Alive) winnerId = p2.userId;
    else winnerId = pc.defenderId;
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

function battleMutexKey(battleId: string): string {
  return `battle:${battleId}:mutex`;
}

export async function readBattleState(
  battleId: string
): Promise<BattleRedisState | null> {
  try {
    const raw = await redis.get(battleKey(battleId));
    if (!raw) return null;
    const state = JSON.parse(raw) as BattleRedisState;
    // Backward-compat: ensure new fields exist for states created before this migration
    state.usedQuestionIds ??= [];
    state.waitingExpiresAt ??= null;
    state.maxPlayers ??= 2;
    state.kills ??= [];
    for (const p of Object.values(state.participants)) {
      p.lastAnswerCorrect ??= null;
      p.isEliminated ??= false;
    }
    return state;
  } catch {
    return null;
  }
}

// ============================================================
// LAST-SEEN — separate Redis hash so getState doesn't need to
// rewrite the full state just to track heartbeats (which would
// race with submitAnswer / submitAction writes)
// ============================================================

function lastSeenKey(battleId: string): string {
  return `battle:${battleId}:lastseen`;
}

/** Atomically record that userId is still active in this battle. */
export async function updateLastSeen(
  battleId: string,
  userId: string
): Promise<void> {
  try {
    await redis.hset(lastSeenKey(battleId), userId, Date.now().toString());
    // Refresh TTL on each heartbeat; same lifetime as the battle state
    await redis.expire(lastSeenKey(battleId), BATTLE_STATE_TTL);
  } catch {
    // non-fatal
  }
}

/**
 * Returns the most-recent lastSeen timestamp for each userId in the map.
 * Falls back to 0 (treated as abandoned) when a key is missing.
 */
export async function getLastSeenMap(
  battleId: string
): Promise<Record<string, number>> {
  try {
    const raw = await redis.hgetall(lastSeenKey(battleId));
    if (!raw) return {};
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      result[k] = parseInt(v, 10);
    }
    return result;
  } catch {
    return {};
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
    return false;
  }
}

/**
 * Per-battle mutex to serialize concurrent player mutations.
 * Returns a release function. TTL of 5s ensures auto-release if server crashes.
 */
export async function acquireBattleMutex(
  battleId: string
): Promise<(() => Promise<void>) | null> {
  const key = battleMutexKey(battleId);
  const lockValue = `${Date.now()}-${Math.random()}`;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const result = await redis.set(key, lockValue, "EX", 5, "NX");
      if (result === "OK") {
        return async () => {
          try {
            const current = await redis.get(key);
            if (current === lockValue) await redis.del(key);
          } catch {
            // best-effort release
          }
        };
      }
    } catch {
      return null;
    }
    await new Promise<void>((r) => setTimeout(r, 50 + Math.random() * 50));
  }
  return null;
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

/**
 * Expanded invite code space: ~1 billion combinations (32^6).
 * Excludes visually confusing chars (I, O, 0, 1).
 */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
