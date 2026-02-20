import { randomUUID } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@gmq/db";
import { buildAdaptiveQuestion, validateAnswer } from "@gmq/math-engine";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  readBattleState,
  writeBattleState,
  acquireRoundLock,
  acquireBattleMutex,
  storeRoundQuestion,
  getRoundQuestion,
  generateInviteCode,
  resolveRound,
  resolveMultiplayerRound,
  resolveCounter,
  calcBattleXp,
  isAbandoned,
  alivePlayers,
  ENTRY_FEE_XP,
  WINNER_BONUS_XP_PER_PLAYER,
  COUNTER_TIMEOUT_MS,
  QUEUE_ENTRY_TTL_MS,
  startingHp,
  type BattleRedisState,
  type BattleParticipantState,
  type BattleQuestionState,
} from "../battle-state";
import { redis } from "../redis";

// Sorted-Set queue key per player count
function queueKey(maxPlayers: number): string {
  return maxPlayers === 2
    ? "battle:matchmaking:zqueue"          // keeps backward compat with old key
    : `battle:matchmaking:zqueue:${maxPlayers}`;
}

const DOMAINS = [
  "ARITHMETIC", "ALGEBRA", "GEOMETRY", "FRACTIONS", "WORD_PROBLEMS",
] as const;

// ============================================================
// HELPER: select a question for a battle round
// ============================================================
async function selectBattleQuestion(
  db: PrismaClient,
  round: number,
  excludeDbIds: string[] = []
): Promise<BattleQuestionState> {
  const useAdaptive = Math.random() < 0.3;

  if (!useAdaptive) {
    try {
      const where = excludeDbIds.length > 0
        ? { isPublished: true, id: { notIn: excludeDbIds } }
        : { isPublished: true };

      const count = await db.question.count({ where });
      if (count > 0) {
        const skip = Math.floor(Math.random() * count);
        const q = await db.question.findFirst({ where, skip });
        if (q) {
          return {
            token: randomUUID(),
            promptEn: q.contentEn,
            promptZh: q.contentZh,
            difficulty: q.difficulty,
            category: q.category,
            answer: q.answer,
            dbId: q.id,
          };
        }
      }
    } catch {
      // fall through to adaptive
    }
  }

  const domain = DOMAINS[round % DOMAINS.length]!;
  const profile = { accuracy: 0.7, avgTimeMs: 15000, streak: 2, level: 2 as const };
  const generated = buildAdaptiveQuestion({ tagName: domain, profile });
  return {
    token: randomUUID(),
    promptEn: generated.promptEn,
    promptZh: generated.promptZh,
    difficulty: generated.level >= 4 ? "HARD" : generated.level >= 3 ? "MEDIUM" : "EASY",
    category: domain,
    answer: generated.answer,
  };
}

// ============================================================
// HELPER: finalize battle — awards kill XP + winner bonus
// ============================================================
/**
 * XP economy:
 *   • Entry fee pre-deducted at join (1000 XP per player).
 *   • Kill reward: killer receives victim.xpStaked from system (+1000).
 *   • Final winner: receives own stake back + system bonus (maxPlayers × 1000).
 *   • Eliminated players: already paid; get no XP back unless they earned kill rewards.
 */
async function finalizeBattle(
  db: PrismaClient,
  state: BattleRedisState,
  winnerId: string | null
): Promise<void> {
  // NOTE: do NOT guard on state.status here — resolve functions (resolveRound,
  // resolveMultiplayerRound, resolveCounter) already set state.status = "FINISHED"
  // before calling this function. Checking it would cause an immediate early return
  // and skip all DB work (XP awards, kill records, stats). Idempotency is handled
  // by the DB-level updateMany guard below.
  if (state.status === "ABANDONED") return;

  state.status = "FINISHED";
  state.phase = "FINISHED";
  state.winnerId = winnerId;

  try {
    const participantIds = Object.keys(state.participants);
    const maxPlayers = state.maxPlayers ?? 2;

    // Idempotency guard — only finalize once
    const updateResult = await db.battle.updateMany({
      where: { id: state.battleId, status: { not: "FINISHED" } },
      data: { status: "FINISHED", finishedAt: new Date(), currentRound: state.currentRound },
    });
    if (updateResult.count === 0) return;

    // ── Build XP awards map ─────────────────────────────────
    const xpAwards: Record<string, number> = {};

    if (maxPlayers === 2) {
      // Classic 1v1: winner gets both stakes (net +1000)
      const loserId = participantIds.find((id) => id !== winnerId) ?? null;
      if (winnerId && loserId) {
        const winnerStake = state.participants[winnerId]?.xpStaked ?? ENTRY_FEE_XP;
        const loserStake = state.participants[loserId]?.xpStaked ?? ENTRY_FEE_XP;
        xpAwards[winnerId] = winnerStake + loserStake;
        state.participants[winnerId]!.xpChange = loserStake;         // net gain
        state.participants[loserId]!.xpChange = -loserStake;         // net loss
      } else {
        // Solo / draw — full refund
        for (const id of participantIds) {
          xpAwards[id] = state.participants[id]?.xpStaked ?? ENTRY_FEE_XP;
          state.participants[id]!.xpChange = 0;
        }
      }
    } else {
      // Multi-player: kill rewards + winner bonus
      const kills = state.kills ?? [];

      // Kill reward: each kill gives the killer the victim's staked XP
      for (const kill of kills) {
        if (kill.killerUserId) {
          xpAwards[kill.killerUserId] =
            (xpAwards[kill.killerUserId] ?? 0) + kill.xpStaked;
        }
      }

      // Winner gets own stake returned + system bonus
      if (winnerId) {
        const winnerStake = state.participants[winnerId]?.xpStaked ?? ENTRY_FEE_XP;
        const winnerBonus = maxPlayers * WINNER_BONUS_XP_PER_PLAYER;
        xpAwards[winnerId] =
          (xpAwards[winnerId] ?? 0) + winnerStake + winnerBonus;
      }

      // Compute net xpChange for each participant
      for (const [uid, p] of Object.entries(state.participants)) {
        const earned = xpAwards[uid] ?? 0;
        p.xpChange = earned - p.xpStaked; // paid xpStaked at entry, get back earned
      }
    }

    // ── DB updates ──────────────────────────────────────────
    const kills = state.kills ?? [];

    await Promise.all([
      // Grant earned XP
      ...Object.entries(xpAwards)
        .filter(([, amt]) => amt > 0)
        .map(([uid, amt]) =>
          db.user.update({ where: { id: uid }, data: { xp: { increment: amt } } })
        ),

      // Winner stats
      ...(winnerId
        ? [
            db.user.update({
              where: { id: winnerId },
              data: { battlesWon: { increment: 1 }, battlesPlayed: { increment: 1 } },
            }),
          ]
        : []),

      // All non-winner battlesPlayed
      ...participantIds
        .filter((id) => id !== winnerId)
        .map((id) =>
          db.user.update({ where: { id }, data: { battlesPlayed: { increment: 1 } } })
        ),

      // Update BattleParticipant records
      ...Object.entries(state.participants).map(([uid, p]) =>
        db.battleParticipant.update({
          where: { battleId_userId: { battleId: state.battleId, userId: uid } },
          data: {
            isWinner: uid === winnerId,
            xpChange: p.xpChange ?? 0,
            hp: p.hp,
            isEliminated: p.isEliminated ?? false,
            killedByUserId:
              kills.find((k) => k.killedUserId === uid)?.killerUserId ?? null,
          },
        })
      ),
    ]);
  } catch (err) {
    console.error("[Battle] finalizeBattle error:", err);
  }
}

// ============================================================
// HELPER: sync HP and battleXp to DB after each round
// ============================================================
async function syncParticipantsToDB(
  db: PrismaClient,
  state: BattleRedisState
): Promise<void> {
  try {
    await Promise.all(
      Object.values(state.participants).map((p) =>
        db.battleParticipant.update({
          where: { battleId_userId: { battleId: state.battleId, userId: p.userId } },
          data: { hp: p.hp, battleXp: p.battleXp, isEliminated: p.isEliminated },
        })
      )
    );
  } catch (err) {
    console.error("[Battle] syncParticipantsToDB error:", err);
  }
}

// ============================================================
// HELPER: advance to next answering round
// ============================================================
async function startNextRound(
  db: PrismaClient,
  state: BattleRedisState
): Promise<void> {
  const nextQ = await selectBattleQuestion(
    db,
    state.currentRound,
    state.usedQuestionIds ?? []
  );
  if (nextQ.dbId) {
    state.usedQuestionIds = [...(state.usedQuestionIds ?? []), nextQ.dbId];
  }
  await storeRoundQuestion(state.battleId, state.currentRound, nextQ);
  state.currentQuestion = {
    promptEn: nextQ.promptEn,
    promptZh: nextQ.promptZh,
    difficulty: nextQ.difficulty,
    category: nextQ.category,
    token: nextQ.token,
  };
  state.roundStartedAt = Date.now();
  state.phase = "ANSWERING";

  await Promise.all([
    db.battle.update({
      where: { id: state.battleId },
      data: { currentRound: state.currentRound },
    }),
    syncParticipantsToDB(db, state),
  ]);
}

// ============================================================
// HELPER: build client-safe snapshot
// ============================================================
type OpponentSnapshot = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  hp: number;
  hasAnswered: boolean;
  hasActed: boolean;
  isEliminated: boolean;
};

type GameStateSnapshot = {
  battleId: string;
  status: BattleRedisState["status"];
  phase: BattleRedisState["phase"];
  currentRound: number;
  roundTimeRemaining: number;
  maxPlayers: number;
  playerCount: number;       // total joined (including eliminated)
  me: {
    hp: number;
    battleXp: number;
    hasAnswered: boolean;
    hasActed: boolean;
    attackPowerUsed: number;
    xpStaked: number;
    xpChange: number | null;
    isEliminated: boolean;
  } | null;
  /** All opponents (alive and eliminated). For 2-player `opponent` alias still present. */
  opponents: OpponentSnapshot[];
  /** Backward-compat alias = opponents[0] ?? null */
  opponent: OpponentSnapshot | null;
  currentQuestion: Omit<BattleQuestionState, "answer" | "dbId"> | null;
  lastRoundSummary: BattleRedisState["lastRoundSummary"];
  counterChoice: {
    isDefender: boolean;
    defenderRemainingPower: number;
    attackerCurrentPower: number;
    counterDamage: number;
    activeAttackDamage: number;
  } | null;
  winnerId: string | null;
  kills: BattleRedisState["kills"];
};

function buildSnapshot(state: BattleRedisState, myUserId: string): GameStateSnapshot {
  const me = state.participants[myUserId] ?? null;
  const now = Date.now();
  const roundTimeRemaining =
    state.roundStartedAt > 0
      ? Math.max(
          0,
          Math.ceil(
            (state.roundStartedAt + state.roundTimeoutSec * 1000 - now) / 1000
          )
        )
      : state.roundTimeoutSec;

  const opponents: OpponentSnapshot[] = Object.values(state.participants)
    .filter((p) => p.userId !== myUserId)
    .map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      hp: p.hp,
      hasAnswered: p.hasAnswered,
      hasActed: p.hasActed,
      isEliminated: p.isEliminated,
    }));

  let counterChoice: GameStateSnapshot["counterChoice"] = null;
  if (state.phase === "COUNTER_CHOICE" && state.pendingCounter) {
    const pc = state.pendingCounter;
    const attackerState = state.participants[pc.attackerId];
    counterChoice = {
      isDefender: pc.defenderId === myUserId,
      defenderRemainingPower: pc.defenderRemainingPower,
      attackerCurrentPower: attackerState?.battleXp ?? 0,
      counterDamage: pc.defenderRemainingPower * 2,
      activeAttackDamage: Math.max(
        0,
        (pc.defenderRemainingPower - (attackerState?.battleXp ?? 0)) * 3
      ),
    };
  }

  const currentQuestion = state.currentQuestion
    ? {
        promptEn: state.currentQuestion.promptEn,
        promptZh: state.currentQuestion.promptZh,
        difficulty: state.currentQuestion.difficulty,
        category: state.currentQuestion.category,
        token: state.currentQuestion.token,
      }
    : null;

  return {
    battleId: state.battleId,
    status: state.status,
    phase: state.phase,
    currentRound: state.currentRound,
    roundTimeRemaining,
    maxPlayers: state.maxPlayers ?? 2,
    playerCount: Object.keys(state.participants).length,
    me: me
      ? {
          hp: me.hp,
          battleXp: me.battleXp,
          hasAnswered: me.hasAnswered,
          hasActed: me.hasActed,
          attackPowerUsed: me.attackPowerUsed ?? 0,
          xpStaked: me.xpStaked,
          xpChange: me.xpChange ?? null,
          isEliminated: me.isEliminated,
        }
      : null,
    opponents,
    opponent: opponents[0] ?? null,
    currentQuestion,
    lastRoundSummary: state.lastRoundSummary,
    counterChoice,
    winnerId: state.winnerId,
    kills: state.kills ?? [],
  };
}

// ============================================================
// HELPER: build initial participant state
// ============================================================
function makeParticipant(
  userId: string,
  displayName: string,
  avatarUrl: string | null,
  hp: number
): BattleParticipantState {
  return {
    userId,
    displayName,
    avatarUrl,
    hp,
    battleXp: 0,
    hasAnswered: false,
    hasActed: false,
    actionChosen: "NONE",
    attackPowerUsed: 0,
    isEliminated: false,
    lastSeenAt: Date.now(),
    xpStaked: ENTRY_FEE_XP,
    lastAnswerCorrect: null,
  };
}

// ============================================================
// HELPER: atomically deduct entry fee
// ============================================================
async function deductEntryFee(db: PrismaClient, userId: string): Promise<void> {
  const affected = await db.$executeRaw`
    UPDATE "User" SET "xp" = "xp" - ${ENTRY_FEE_XP}
    WHERE "id" = ${userId} AND "xp" >= ${ENTRY_FEE_XP}
  `;
  if (affected === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `You need at least ${ENTRY_FEE_XP} XP to enter a battle.`,
    });
  }
}

// ============================================================
// HELPER: activate a battle that just reached maxPlayers
// ============================================================
async function activateBattle(
  db: PrismaClient,
  state: BattleRedisState
): Promise<void> {
  const firstQ = await selectBattleQuestion(
    db,
    0,
    state.usedQuestionIds ?? []
  );
  if (firstQ.dbId) {
    state.usedQuestionIds = [firstQ.dbId];
  }
  await storeRoundQuestion(state.battleId, 0, firstQ);
  state.status = "ACTIVE";
  state.phase = "ANSWERING";
  state.currentRound = 0;
  state.roundStartedAt = Date.now();
  state.currentQuestion = {
    promptEn: firstQ.promptEn,
    promptZh: firstQ.promptZh,
    difficulty: firstQ.difficulty,
    category: firstQ.category,
    token: firstQ.token,
  };

  await db.battle.update({
    where: { id: state.battleId },
    data: { status: "ACTIVE", currentRound: 0 },
  });
}

// ============================================================
// ROUTER
// ============================================================
export const battleRouter = createTRPCRouter({
  // ----------------------------------------------------------
  // CREATE
  // ----------------------------------------------------------
  create: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["INVITE", "RANDOM"]),
        maxPlayers: z.number().int().min(2).max(6).default(2),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const maxPlayers = input.maxPlayers;
      const hp = startingHp(maxPlayers);

      const user = await ctx.db.user.findUniqueOrThrow({
        where: { id: userId },
        select: { xp: true, displayName: true, avatarUrl: true },
      });

      // Cancel any stale WAITING battle
      const existingWaiting = await ctx.db.battle.findFirst({
        where: { status: "WAITING", participants: { some: { userId } } },
        select: { id: true },
      });
      if (existingWaiting) {
        const deleted = await ctx.db.battle.deleteMany({
          where: { id: existingWaiting.id, status: "WAITING" },
        });
        if (deleted.count > 0) {
          await ctx.db.user
            .update({ where: { id: userId }, data: { xp: { increment: ENTRY_FEE_XP } } })
            .catch(() => null);
          await redis
            .zrem(queueKey(maxPlayers), existingWaiting.id)
            .catch(() => null);
        } else {
          return {
            battleId: existingWaiting.id,
            inviteCode: null as string | null,
            status: "ACTIVE" as const,
            waitingForOpponent: false,
          };
        }
      }

      if (user.xp < ENTRY_FEE_XP) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You need at least ${ENTRY_FEE_XP} XP to enter a battle.`,
        });
      }

      if (input.mode === "RANDOM") {
        const key = queueKey(maxPlayers);
        await redis.zremrangebyscore(key, "-inf", Date.now()).catch(() => null);
        const popped = await redis.zpopmin(key, 1).catch(() => [] as string[]);
        const waitingId =
          Array.isArray(popped) && popped.length >= 1 ? String(popped[0]) : null;

        if (waitingId) {
          const existing = await ctx.db.battle.findUnique({
            where: { id: waitingId },
            include: {
              participants: {
                include: { user: { select: { displayName: true, avatarUrl: true } } },
              },
            },
          });

          if (
            existing?.status === "WAITING" &&
            existing.participants.length < maxPlayers &&
            !existing.participants.some((p) => p.userId === userId)
          ) {
            // Deduct fee and join the waiting battle
            await deductEntryFee(ctx.db as unknown as PrismaClient, userId);

            await ctx.db.battleParticipant.create({
              data: {
                battleId: waitingId,
                userId,
                xpStaked: ENTRY_FEE_XP,
                hp,
              },
            });

            // Load or create Redis state
            let state = await readBattleState(waitingId);
            if (!state) {
              // Build state from DB participants
              state = {
                battleId: waitingId,
                status: "WAITING",
                phase: "ANSWERING",
                currentRound: 0,
                roundStartedAt: 0,
                roundTimeoutSec: 30,
                maxPlayers,
                participants: Object.fromEntries(
                  existing.participants.map((p) => [
                    p.userId,
                    makeParticipant(p.userId, p.user.displayName, p.user.avatarUrl, hp),
                  ])
                ),
                currentQuestion: null,
                lastRoundSummary: null,
                pendingCounter: null,
                kills: [],
                winnerId: null,
                countdownStartedAt: null,
                usedQuestionIds: [],
                waitingExpiresAt: Date.now() + QUEUE_ENTRY_TTL_MS,
              };
            }

            // Add joiner
            state.participants[userId] = makeParticipant(
              userId,
              user.displayName,
              user.avatarUrl,
              hp
            );

            const totalJoined = Object.keys(state.participants).length;

            if (totalJoined >= maxPlayers) {
              // Battle is full — start it
              await activateBattle(ctx.db as unknown as PrismaClient, state);
              await writeBattleState(state);
              return {
                battleId: waitingId,
                inviteCode: null as string | null,
                status: "ACTIVE" as const,
                waitingForOpponent: false,
              };
            } else {
              // Still waiting for more players — re-add to queue
              const expiresAt = Date.now() + QUEUE_ENTRY_TTL_MS;
              state.waitingExpiresAt = expiresAt;
              await redis.zadd(key, expiresAt, waitingId).catch(() => null);
              await writeBattleState(state);
              return {
                battleId: waitingId,
                inviteCode: null as string | null,
                status: "WAITING" as const,
                waitingForOpponent: true,
              };
            }
          }
        }
      }

      // Deduct XP before creating
      await deductEntryFee(ctx.db as unknown as PrismaClient, userId);

      // Create battle with invite-code collision retry
      let battle: { id: string; inviteCode: string | null } | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const inviteCode = input.mode === "INVITE" ? generateInviteCode() : null;
        try {
          battle = await ctx.db.battle.create({
            data: {
              status: "WAITING",
              inviteCode,
              xpStake: ENTRY_FEE_XP,
              maxPlayers,
              participants: {
                create: { userId, xpStaked: ENTRY_FEE_XP, hp },
              },
            },
            select: { id: true, inviteCode: true },
          });
          break;
        } catch (err: unknown) {
          if (
            typeof err === "object" &&
            err !== null &&
            "code" in err &&
            (err as { code: string }).code === "P2002" &&
            attempt < 4
          ) {
            continue;
          }
          await ctx.db.user
            .update({ where: { id: userId }, data: { xp: { increment: ENTRY_FEE_XP } } })
            .catch(() => {});
          throw err;
        }
      }

      if (!battle) {
        await ctx.db.user
          .update({ where: { id: userId }, data: { xp: { increment: ENTRY_FEE_XP } } })
          .catch(() => {});
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create battle.",
        });
      }

      const expiresAt = Date.now() + QUEUE_ENTRY_TTL_MS;
      if (input.mode === "RANDOM") {
        await redis.zadd(queueKey(maxPlayers), expiresAt, battle.id).catch(() => null);
      }

      const state: BattleRedisState = {
        battleId: battle.id,
        status: "WAITING",
        phase: "ANSWERING",
        currentRound: 0,
        roundStartedAt: 0,
        roundTimeoutSec: 30,
        maxPlayers,
        participants: {
          [userId]: makeParticipant(userId, user.displayName, user.avatarUrl, hp),
        },
        currentQuestion: null,
        lastRoundSummary: null,
        pendingCounter: null,
        kills: [],
        winnerId: null,
        countdownStartedAt: null,
        usedQuestionIds: [],
        waitingExpiresAt: expiresAt,
      };
      await writeBattleState(state);

      return {
        battleId: battle.id,
        inviteCode: battle.inviteCode,
        status: "WAITING" as const,
        waitingForOpponent: true,
      };
    }),

  // ----------------------------------------------------------
  // JOIN (invite code)
  // ----------------------------------------------------------
  join: protectedProcedure
    .input(z.object({ inviteCode: z.string().min(1).max(20) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const user = await ctx.db.user.findUniqueOrThrow({
        where: { id: userId },
        select: { xp: true, displayName: true, avatarUrl: true },
      });

      if (user.xp < ENTRY_FEE_XP) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You need at least ${ENTRY_FEE_XP} XP to enter a battle.`,
        });
      }

      const battle = await ctx.db.battle.findUnique({
        where: { inviteCode: input.inviteCode.toUpperCase() },
        include: {
          participants: {
            include: { user: { select: { displayName: true, avatarUrl: true } } },
          },
        },
      });
      if (!battle)
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite code not found." });
      if (battle.status !== "WAITING")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This battle has already started.",
        });
      if (battle.participants.some((p) => p.userId === userId))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already in this battle.",
        });
      if (battle.participants.length >= battle.maxPlayers)
        throw new TRPCError({ code: "BAD_REQUEST", message: "This battle is full." });

      const maxPlayers = battle.maxPlayers;
      const hp = startingHp(maxPlayers);

      await deductEntryFee(ctx.db as unknown as PrismaClient, userId);

      await ctx.db.battleParticipant.create({
        data: { battleId: battle.id, userId, xpStaked: ENTRY_FEE_XP, hp },
      });

      // Load or build Redis state
      let state = await readBattleState(battle.id);
      if (!state) {
        state = {
          battleId: battle.id,
          status: "WAITING",
          phase: "ANSWERING",
          currentRound: 0,
          roundStartedAt: 0,
          roundTimeoutSec: 30,
          maxPlayers,
          participants: Object.fromEntries(
            battle.participants.map((p) => [
              p.userId,
              makeParticipant(p.userId, p.user.displayName, p.user.avatarUrl, hp),
            ])
          ),
          currentQuestion: null,
          lastRoundSummary: null,
          pendingCounter: null,
          kills: [],
          winnerId: null,
          countdownStartedAt: null,
          usedQuestionIds: [],
          waitingExpiresAt: Date.now() + QUEUE_ENTRY_TTL_MS,
        };
      }

      // Add joiner
      state.participants[userId] = makeParticipant(
        userId,
        user.displayName,
        user.avatarUrl,
        hp
      );

      const totalJoined = Object.keys(state.participants).length;

      if (totalJoined >= maxPlayers) {
        await activateBattle(ctx.db as unknown as PrismaClient, state);
        await writeBattleState(state);
        return { battleId: battle.id, status: "ACTIVE" as const };
      } else {
        await writeBattleState(state);
        return { battleId: battle.id, status: "WAITING" as const };
      }
    }),

  // ----------------------------------------------------------
  // GET STATE (polled every 1.5s)
  // ----------------------------------------------------------
  getState: protectedProcedure
    .input(z.object({ battleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      let state = await readBattleState(input.battleId);

      if (!state) {
        const battle = await ctx.db.battle.findUnique({
          where: { id: input.battleId },
          include: {
            participants: {
              include: { user: { select: { displayName: true, avatarUrl: true } } },
            },
          },
        });
        if (!battle) throw new TRPCError({ code: "NOT_FOUND" });
        const maxPlayers = battle.maxPlayers ?? 2;
        const hp = startingHp(maxPlayers);
        const coldState: BattleRedisState = {
          battleId: battle.id,
          status: battle.status as BattleRedisState["status"],
          phase: "ANSWERING",
          currentRound: battle.currentRound,
          roundStartedAt: 0,
          roundTimeoutSec: battle.roundTimeoutSec,
          maxPlayers,
          participants: Object.fromEntries(
            battle.participants.map((p) => [
              p.userId,
              {
                userId: p.userId,
                displayName: p.user.displayName,
                avatarUrl: p.user.avatarUrl,
                hp: p.hp,
                battleXp: p.battleXp,
                hasAnswered: false,
                hasActed: false,
                actionChosen: "NONE" as const,
                attackPowerUsed: 0,
                isEliminated: p.isEliminated,
                lastSeenAt: Date.now(),
                xpStaked: ENTRY_FEE_XP,
                lastAnswerCorrect: null,
              } satisfies BattleParticipantState,
            ])
          ),
          currentQuestion: null,
          lastRoundSummary: null,
          pendingCounter: null,
          kills: [],
          winnerId: null,
          countdownStartedAt: null,
          usedQuestionIds: [],
          waitingExpiresAt: null,
        };
        // suppress unused variable warning
        void hp;
        state = coldState;
      }

      const st: BattleRedisState = state;

      if (!st.participants[userId]) throw new TRPCError({ code: "FORBIDDEN" });

      st.participants[userId]!.lastSeenAt = Date.now();

      // Auto-expire WAITING battles that exceeded queue TTL
      if (
        st.status === "WAITING" &&
        st.waitingExpiresAt &&
        Date.now() > st.waitingExpiresAt
      ) {
        const xpToRefund = st.participants[userId]?.xpStaked ?? ENTRY_FEE_XP;
        await ctx.db
          .$transaction(async (tx) => {
            const deleted = await tx.battle.deleteMany({
              where: { id: input.battleId, status: "WAITING" },
            });
            if (deleted.count > 0) {
              await tx.user.update({
                where: { id: userId },
                data: { xp: { increment: xpToRefund } },
              });
            }
          })
          .catch((e) => console.error("[Battle] auto-expire error:", e));
        await redis.zrem(queueKey(st.maxPlayers ?? 2), input.battleId).catch(() => null);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Waiting time expired. Your XP has been refunded.",
        });
      }

      const maxPlayers = st.maxPlayers ?? 2;

      if (st.status === "ACTIVE") {
        const alive = alivePlayers(st);

        // Abandon detection: eliminate disconnected players
        for (const p of alive) {
          if (p.userId !== userId && isAbandoned(p)) {
            p.isEliminated = true;
            // Give kill reward to system (no specific killer) — excluded from kill list
            // Just remove from alive, no xpStaked award for environment kill
          }
        }

        const aliveAfterAbandon = alivePlayers(st);
        if (aliveAfterAbandon.length === 1 && aliveAfterAbandon[0]!.userId === userId) {
          // Only player remaining — win by default
          await finalizeBattle(ctx.db as unknown as PrismaClient, st, userId);
        } else if (aliveAfterAbandon.length === 0) {
          await finalizeBattle(ctx.db as unknown as PrismaClient, st, userId);
        }

        const answerDeadline = st.roundStartedAt + st.roundTimeoutSec * 1000;
        const currentAlive = alivePlayers(st);

        // Answer timeout → auto-blank for non-answerers
        if (
          st.phase === "ANSWERING" &&
          st.roundStartedAt > 0 &&
          Date.now() > answerDeadline
        ) {
          for (const p of currentAlive) {
            if (!p.hasAnswered) {
              p.hasAnswered = true;
              p.lastAnswerCorrect = false;
            }
          }
          st.phase = "ACTING";
        }

        // Action timeout (10s after answering closes) → auto ATTACK_100
        const actionDeadline = answerDeadline + 10_000;
        if (st.phase === "ACTING" && Date.now() > actionDeadline) {
          for (const p of currentAlive) {
            if (!p.hasActed) {
              p.hasActed = true;
              p.actionChosen = "ATTACK_100";
            }
          }
        }

        // Counter-choice timeout (2-player only) → auto-COUNTER
        if (
          maxPlayers === 2 &&
          st.phase === "COUNTER_CHOICE" &&
          st.pendingCounter &&
          Date.now() - st.pendingCounter.startedAt > COUNTER_TIMEOUT_MS
        ) {
          const hasLock = await acquireRoundLock(st.battleId, st.currentRound);
          if (hasLock) {
            const { finished, winnerId } = resolveCounter(st, "COUNTER");
            if (finished) {
              await finalizeBattle(ctx.db as unknown as PrismaClient, st, winnerId);
            } else {
              await startNextRound(ctx.db as unknown as PrismaClient, st);
            }
          } else {
            // Another process already resolved this round. Re-read fresh state
            // to avoid overwriting it with our stale copy.
            const fresh = await readBattleState(input.battleId);
            if (fresh) {
              fresh.participants[userId]!.lastSeenAt = Date.now();
              await writeBattleState(fresh);
              return buildSnapshot(fresh, userId);
            }
          }
        }

        // All alive players acted → resolve round
        const aliveNow = alivePlayers(st);
        const allActed =
          aliveNow.length > 0 && aliveNow.every((p) => p.hasActed);

        if (st.phase === "ACTING" && allActed) {
          const hasLock = await acquireRoundLock(st.battleId, st.currentRound);
          if (hasLock) {
            if (maxPlayers === 2) {
              const { finished, winnerId, hasPendingCounter } = resolveRound(st);
              if (hasPendingCounter) {
                st.phase = "COUNTER_CHOICE";
              } else if (finished) {
                await finalizeBattle(ctx.db as unknown as PrismaClient, st, winnerId);
              } else {
                await startNextRound(ctx.db as unknown as PrismaClient, st);
              }
            } else {
              const { finished, winnerId } = resolveMultiplayerRound(st);
              if (finished) {
                await finalizeBattle(ctx.db as unknown as PrismaClient, st, winnerId);
              } else {
                await startNextRound(ctx.db as unknown as PrismaClient, st);
              }
            }
          } else {
            // Another process already resolved this round (submitAction or another
            // concurrent getState). Re-read the fresh post-resolution state instead
            // of writing our stale ACTING snapshot, which would undo the round advance
            // and leave everyone stuck until the 30-second roundLock TTL expires.
            const fresh = await readBattleState(input.battleId);
            if (fresh) {
              fresh.participants[userId]!.lastSeenAt = Date.now();
              await writeBattleState(fresh);
              return buildSnapshot(fresh, userId);
            }
          }
        }
      }

      await writeBattleState(st);
      return buildSnapshot(st, userId);
    }),

  // ----------------------------------------------------------
  // SUBMIT ANSWER
  // ----------------------------------------------------------
  submitAnswer: protectedProcedure
    .input(
      z.object({
        battleId: z.string(),
        answer: z.string().min(1).max(200),
        responseTimeMs: z.number().int().min(0).max(60000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const release = await acquireBattleMutex(input.battleId);
      try {
        const state = await readBattleState(input.battleId);
        if (!state) throw new TRPCError({ code: "NOT_FOUND" });
        if (!state.participants[userId]) throw new TRPCError({ code: "FORBIDDEN" });
        if (state.status !== "ACTIVE")
          throw new TRPCError({ code: "BAD_REQUEST", message: "Battle not active." });
        if (state.phase !== "ANSWERING")
          throw new TRPCError({ code: "BAD_REQUEST", message: "Not in answering phase." });
        if (state.participants[userId]!.hasAnswered)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Already answered." });
        if (state.participants[userId]!.isEliminated)
          throw new TRPCError({ code: "BAD_REQUEST", message: "You are eliminated." });

        const questionData = await getRoundQuestion(state.battleId, state.currentRound);
        if (!questionData)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Question not found.",
          });

        const isCorrect = validateAnswer(input.answer, questionData.answer);
        const battleXpGained = calcBattleXp(
          isCorrect,
          questionData.difficulty,
          input.responseTimeMs,
          state.roundTimeoutSec
        );

        const participant = state.participants[userId]!;
        participant.hasAnswered = true;
        participant.battleXp += battleXpGained;
        participant.lastAnswerCorrect = isCorrect;

        try {
          const dbParticipant = await ctx.db.battleParticipant.findUnique({
            where: { battleId_userId: { battleId: input.battleId, userId } },
          });
          if (dbParticipant) {
            await ctx.db.battleRound.create({
              data: {
                battleId: input.battleId,
                participantId: dbParticipant.id,
                roundNumber: state.currentRound,
                questionToken: questionData.token,
                questionData: {
                  promptEn: questionData.promptEn,
                  promptZh: questionData.promptZh,
                  difficulty: questionData.difficulty,
                  category: questionData.category,
                },
                answerSubmitted: input.answer,
                isCorrect,
                responseTimeMs: input.responseTimeMs,
                battleXpGained,
                answeredAt: new Date(),
              },
            });
          }
        } catch (err) {
          console.error("[Battle] round persist error:", err);
        }

        // Advance to ACTING when all alive players have answered
        const alive = alivePlayers(state);
        const allAnswered = alive.length > 0 && alive.every((p) => p.hasAnswered);
        if (allAnswered) state.phase = "ACTING";

        await writeBattleState(state);
        return {
          isCorrect,
          battleXpGained,
          correctAnswer: isCorrect ? null : questionData.answer,
        };
      } finally {
        await release?.();
      }
    }),

  // ----------------------------------------------------------
  // SUBMIT ACTION (ACTING phase)
  // ----------------------------------------------------------
  submitAction: protectedProcedure
    .input(
      z.object({
        battleId: z.string(),
        action: z.enum(["ATTACK_50", "ATTACK_80", "ATTACK_100", "HOLD"]),
        targetUserId: z.string().optional(), // required for 3+ player battles
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const release = await acquireBattleMutex(input.battleId);
      try {
        const state = await readBattleState(input.battleId);
        if (!state) throw new TRPCError({ code: "NOT_FOUND" });
        if (!state.participants[userId]) throw new TRPCError({ code: "FORBIDDEN" });
        if (state.status !== "ACTIVE")
          throw new TRPCError({ code: "BAD_REQUEST", message: "Battle not active." });
        if (state.phase !== "ACTING")
          throw new TRPCError({ code: "BAD_REQUEST", message: "Not in acting phase." });

        const participant = state.participants[userId]!;
        if (participant.hasActed) return { acknowledged: true, resolved: false };
        if (participant.isEliminated) return { acknowledged: true, resolved: false };

        participant.hasActed = true;
        participant.actionChosen = input.action;
        if (input.targetUserId) {
          participant.targetUserId = input.targetUserId;
        }

        const maxPlayers = state.maxPlayers ?? 2;
        const alive = alivePlayers(state);
        const allActed = alive.length > 0 && alive.every((p) => p.hasActed);

        if (allActed) {
          const hasLock = await acquireRoundLock(state.battleId, state.currentRound);
          if (hasLock) {
            if (maxPlayers === 2) {
              const { finished, winnerId, hasPendingCounter } = resolveRound(state);
              if (hasPendingCounter) {
                state.phase = "COUNTER_CHOICE";
              } else if (finished) {
                await finalizeBattle(
                  ctx.db as unknown as PrismaClient,
                  state,
                  winnerId
                );
              } else {
                await startNextRound(ctx.db as unknown as PrismaClient, state);
              }
            } else {
              const { finished, winnerId } = resolveMultiplayerRound(state);
              if (finished) {
                await finalizeBattle(
                  ctx.db as unknown as PrismaClient,
                  state,
                  winnerId
                );
              } else {
                await startNextRound(ctx.db as unknown as PrismaClient, state);
              }
            }
          }
        }

        await writeBattleState(state);
        return { acknowledged: true, resolved: allActed };
      } finally {
        await release?.();
      }
    }),

  // ----------------------------------------------------------
  // SUBMIT COUNTER (2-player COUNTER_CHOICE phase)
  // ----------------------------------------------------------
  submitCounter: protectedProcedure
    .input(
      z.object({
        battleId: z.string(),
        action: z.enum(["COUNTER", "ACTIVE_ATTACK"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const state = await readBattleState(input.battleId);
      if (!state) throw new TRPCError({ code: "NOT_FOUND" });
      if (!state.participants[userId]) throw new TRPCError({ code: "FORBIDDEN" });
      if (state.status !== "ACTIVE")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Battle not active." });
      if (state.phase !== "COUNTER_CHOICE")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Not in counter choice phase." });
      if (!state.pendingCounter)
        throw new TRPCError({ code: "BAD_REQUEST", message: "No pending counter." });
      if (state.pendingCounter.defenderId !== userId)
        throw new TRPCError({ code: "FORBIDDEN", message: "It is not your turn to counter." });

      const { finished, winnerId } = resolveCounter(state, input.action);

      if (finished) {
        await finalizeBattle(ctx.db as unknown as PrismaClient, state, winnerId);
      } else {
        await startNextRound(ctx.db as unknown as PrismaClient, state);
      }

      await writeBattleState(state);
      return { acknowledged: true, finished };
    }),

  // ----------------------------------------------------------
  // FORFEIT
  // ----------------------------------------------------------
  forfeit: protectedProcedure
    .input(z.object({ battleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const state = await readBattleState(input.battleId);
      if (!state) throw new TRPCError({ code: "NOT_FOUND" });
      if (!state.participants[userId]) throw new TRPCError({ code: "FORBIDDEN" });
      if (state.status === "FINISHED" || state.status === "ABANDONED") {
        return { battleId: input.battleId, status: state.status };
      }

      // In multi-player: eliminate the forfeiting player, let battle continue
      const maxPlayers = state.maxPlayers ?? 2;
      if (maxPlayers > 2 && state.status === "ACTIVE") {
        const p = state.participants[userId]!;
        p.isEliminated = true;

        const alive = alivePlayers(state);
        if (alive.length === 1) {
          await finalizeBattle(
            ctx.db as unknown as PrismaClient,
            state,
            alive[0]!.userId
          );
        } else if (alive.length === 0) {
          await finalizeBattle(ctx.db as unknown as PrismaClient, state, null);
        }
        await writeBattleState(state);
        return { battleId: input.battleId, status: state.status };
      }

      // 2-player: classic forfeit — opponent wins
      const opponent = Object.values(state.participants).find(
        (p) => p.userId !== userId
      );
      await finalizeBattle(
        ctx.db as unknown as PrismaClient,
        state,
        opponent?.userId ?? null
      );
      await writeBattleState(state);
      return { battleId: input.battleId, status: "FINISHED" as const };
    }),

  // ----------------------------------------------------------
  // CANCEL WAITING (leave while waiting for players to join)
  // ----------------------------------------------------------
  cancelWaiting: protectedProcedure
    .input(z.object({ battleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const battle = await ctx.db.battle.findUnique({
        where: { id: input.battleId },
        include: { participants: true },
      });
      if (!battle) throw new TRPCError({ code: "NOT_FOUND" });
      if (!battle.participants.some((p) => p.userId === userId))
        throw new TRPCError({ code: "FORBIDDEN" });
      if (battle.status !== "WAITING")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Battle has already started." });

      const maxPlayers = battle.maxPlayers ?? 2;
      const otherParticipants = battle.participants.filter((p) => p.userId !== userId);

      if (otherParticipants.length === 0) {
        // Host is alone — delete the whole battle
        await ctx.db.$transaction([
          ctx.db.battle.delete({ where: { id: input.battleId } }),
          ctx.db.user.update({
            where: { id: userId },
            data: { xp: { increment: ENTRY_FEE_XP } },
          }),
        ]);
        await redis.zrem(queueKey(maxPlayers), input.battleId).catch(() => null);
      } else {
        // Others are waiting — just remove this participant and refund them
        await ctx.db.$transaction([
          ctx.db.battleParticipant.deleteMany({
            where: { battleId: input.battleId, userId },
          }),
          ctx.db.user.update({
            where: { id: userId },
            data: { xp: { increment: ENTRY_FEE_XP } },
          }),
        ]);
        // Update Redis state to remove this player
        const state = await readBattleState(input.battleId);
        if (state) {
          delete state.participants[userId];
          await writeBattleState(state);
        }
      }

      return { cancelled: true };
    }),

  // ----------------------------------------------------------
  // GET HISTORY
  // ----------------------------------------------------------
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(10),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const items = await ctx.db.battleParticipant.findMany({
        where: { userId },
        include: {
          battle: {
            include: {
              participants: {
                include: {
                  user: { select: { displayName: true, avatarUrl: true } },
                },
              },
            },
          },
        },
        orderBy: { battle: { createdAt: "desc" } },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) nextCursor = items.pop()!.id;

      return {
        items: items.map((p) => {
          const opponents = p.battle.participants.filter(
            (op) => op.userId !== userId
          );
          const opponent = opponents[0];
          return {
            battleId: p.battleId,
            isWinner: p.isWinner,
            xpChange: p.xpChange,
            maxPlayers: p.battle.maxPlayers,
            opponentName:
              p.battle.maxPlayers > 2
                ? `${opponents.length} opponents`
                : (opponent?.user.displayName ?? "Unknown"),
            opponentAvatarUrl: opponent?.user.avatarUrl ?? null,
            rounds: p.battle.currentRound,
            finishedAt: p.battle.finishedAt,
            status: p.battle.status,
          };
        }),
        nextCursor,
      };
    }),
});
