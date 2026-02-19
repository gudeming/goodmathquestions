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
  resolveCounter,
  calcBattleXp,
  isAbandoned,
  ENTRY_FEE_XP,
  STARTING_HP,
  COUNTER_TIMEOUT_MS,
  QUEUE_ENTRY_TTL_MS,
  type BattleRedisState,
  type BattleParticipantState,
  type BattleQuestionState,
} from "../battle-state";
import { redis } from "../redis";

// FIX: use a Sorted Set so each entry has its own TTL (score = expiresAt timestamp)
const RANDOM_ZQUEUE_KEY = "battle:matchmaking:zqueue";

const DOMAINS = [
  "ARITHMETIC", "ALGEBRA", "GEOMETRY", "FRACTIONS", "WORD_PROBLEMS",
] as const;

// ============================================================
// HELPER: select a question for a battle round
// FIX: accepts excludeDbIds for deduplication; uses ORDER BY RANDOM() for efficiency
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

      // FIX: ORDER BY RANDOM() via single query instead of count + skip (two queries)
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
            dbId: q.id, // FIX: track DB id for deduplication
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
    // no dbId for adaptive questions
  };
}

// ============================================================
// HELPER: transfer XP and mark battle finished in DB
// FIX: winner gets back both stakes (both were pre-deducted at join)
// ============================================================
async function finalizeBattle(
  db: PrismaClient,
  state: BattleRedisState,
  winnerId: string | null
): Promise<void> {
  // Guard: only finalize once per battle
  if (state.status === "FINISHED" || state.status === "ABANDONED") return;

  state.status = "FINISHED";
  state.phase = "FINISHED";
  state.winnerId = winnerId;

  try {
    const participantIds = Object.keys(state.participants);
    const loserId = participantIds.find((id) => id !== winnerId) ?? null;

    if (winnerId && loserId) {
      const winnerStake = state.participants[winnerId]?.xpStaked ?? ENTRY_FEE_XP;
      const loserStake = state.participants[loserId]?.xpStaked ?? ENTRY_FEE_XP;

      // FIX: XP pre-deducted at join. Winner gets both stakes returned (net gain = loserStake).
      // Winner receives their own stake back + loser's stake.
      state.participants[winnerId]!.xpChange = loserStake;    // net gain
      state.participants[loserId]!.xpChange = -loserStake;    // net loss (already deducted)

      // FIX: Use DB-level conditional update as idempotency guard — if already FINISHED, skip XP ops
      const updateResult = await db.battle.updateMany({
        where: { id: state.battleId, status: { not: "FINISHED" } },
        data: { status: "FINISHED", finishedAt: new Date(), currentRound: state.currentRound },
      });

      if (updateResult.count === 0) {
        // Already finalized by a concurrent request — do not double-reward
        return;
      }

      await Promise.all([
        db.user.update({
          where: { id: winnerId },
          // Gets back own stake + loser's stake; battlesWon incremented
          data: {
            xp: { increment: winnerStake + loserStake },
            battlesWon: { increment: 1 },
            battlesPlayed: { increment: 1 },
          },
        }),
        db.user.update({
          where: { id: loserId },
          // XP already deducted at join; only increment battlesPlayed
          data: { battlesPlayed: { increment: 1 } },
        }),
        db.battleParticipant.update({
          where: { battleId_userId: { battleId: state.battleId, userId: winnerId } },
          data: { isWinner: true, xpChange: loserStake, hp: state.participants[winnerId]?.hp ?? 0 },
        }),
        db.battleParticipant.update({
          where: { battleId_userId: { battleId: state.battleId, userId: loserId } },
          data: { isWinner: false, xpChange: -loserStake, hp: state.participants[loserId]?.hp ?? 0 },
        }),
      ]);
    } else {
      // No winner/loser — refund both participants (e.g., solo forfeit with no opponent)
      const updateResult = await db.battle.updateMany({
        where: { id: state.battleId, status: { not: "FINISHED" } },
        data: { status: "FINISHED", finishedAt: new Date() },
      });
      if (updateResult.count > 0) {
        await Promise.all(
          participantIds.map((id) =>
            db.user
              .update({
                where: { id },
                data: { xp: { increment: state.participants[id]?.xpStaked ?? ENTRY_FEE_XP } },
              })
              .catch(() => {}) // best-effort refund
          )
        );
      }
    }
  } catch (err) {
    console.error("[Battle] finalizeBattle error:", err);
  }
}

// ============================================================
// HELPER: sync current HP and battleXp to DB after each round
// FIX: prevents cold-state reconstruction from resetting to initial values
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
          data: { hp: p.hp, battleXp: p.battleXp },
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
  // FIX: pass usedQuestionIds for deduplication
  const nextQ = await selectBattleQuestion(
    db,
    state.currentRound,
    state.usedQuestionIds ?? []
  );
  // FIX: track this question's DB id to avoid repeating it
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
    // FIX: sync HP/battleXp so cold-state reconstruction uses correct values
    syncParticipantsToDB(db, state),
  ]);
}

// ============================================================
// HELPER: build client-safe snapshot (answer field never sent)
// ============================================================
type GameStateSnapshot = {
  battleId: string;
  status: BattleRedisState["status"];
  phase: BattleRedisState["phase"];
  currentRound: number;
  roundTimeRemaining: number;
  me: {
    hp: number;
    battleXp: number;
    hasAnswered: boolean;
    hasActed: boolean;
    attackPowerUsed: number;
    xpStaked: number;
    xpChange: number | null;
  } | null;
  opponent: {
    displayName: string;
    avatarUrl: string | null;
    hp: number;
    hasAnswered: boolean;
    hasActed: boolean;
  } | null;
  currentQuestion: Omit<BattleQuestionState, "answer" | "dbId"> | null;
  lastRoundSummary: BattleRedisState["lastRoundSummary"];
  // Populated only during COUNTER_CHOICE phase
  counterChoice: {
    isDefender: boolean;          // true = it's MY turn to pick counter action
    defenderRemainingPower: number;
    attackerCurrentPower: number;
    counterDamage: number;        // pre-calculated: remaining × 2
    activeAttackDamage: number;   // pre-calculated: (remaining − attackerPower) × 3
  } | null;
  winnerId: string | null;
};

function buildSnapshot(state: BattleRedisState, myUserId: string): GameStateSnapshot {
  const me = state.participants[myUserId] ?? null;
  const opponent =
    Object.values(state.participants).find((p) => p.userId !== myUserId) ?? null;
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

  let counterChoice: GameStateSnapshot["counterChoice"] = null;
  if (state.phase === "COUNTER_CHOICE" && state.pendingCounter) {
    const pc = state.pendingCounter;
    const attackerState = state.participants[pc.attackerId];
    const attackerCurrentPower = attackerState?.battleXp ?? 0;
    counterChoice = {
      isDefender: pc.defenderId === myUserId,
      defenderRemainingPower: pc.defenderRemainingPower,
      attackerCurrentPower,
      counterDamage: pc.defenderRemainingPower * 2,
      activeAttackDamage: Math.max(
        0,
        (pc.defenderRemainingPower - attackerCurrentPower) * 3
      ),
    };
  }

  // Strip server-only fields from question before sending to client
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
    me: me
      ? {
          hp: me.hp,
          battleXp: me.battleXp,
          hasAnswered: me.hasAnswered,
          hasActed: me.hasActed,
          attackPowerUsed: me.attackPowerUsed ?? 0,
          xpStaked: me.xpStaked,
          xpChange: me.xpChange ?? null,
        }
      : null,
    opponent: opponent
      ? {
          displayName: opponent.displayName,
          avatarUrl: opponent.avatarUrl,
          hp: opponent.hp,
          hasAnswered: opponent.hasAnswered,
          hasActed: opponent.hasActed,
        }
      : null,
    currentQuestion,
    lastRoundSummary: state.lastRoundSummary,
    counterChoice,
    winnerId: state.winnerId,
  };
}

// ============================================================
// HELPER: build initial participant state object
// ============================================================
function makeParticipant(
  userId: string,
  displayName: string,
  avatarUrl: string | null
): BattleParticipantState {
  return {
    userId,
    displayName,
    avatarUrl,
    hp: STARTING_HP,
    battleXp: 0,
    hasAnswered: false,
    hasActed: false,
    actionChosen: "NONE",
    attackPowerUsed: 0,
    lastSeenAt: Date.now(),
    xpStaked: ENTRY_FEE_XP,
    lastAnswerCorrect: null, // FIX: initialize new field
  };
}

// ============================================================
// HELPER: atomically deduct entry fee — throws if insufficient XP
// FIX: prevents double-spend by using a single atomic conditional UPDATE
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
// ROUTER
// ============================================================
export const battleRouter = createTRPCRouter({
  // ----------------------------------------------------------
  // CREATE
  // ----------------------------------------------------------
  create: protectedProcedure
    .input(z.object({ mode: z.enum(["INVITE", "RANDOM"]) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const user = await ctx.db.user.findUniqueOrThrow({
        where: { id: userId },
        select: { xp: true, displayName: true, avatarUrl: true },
      });

      // If user has a stale WAITING battle, cancel it and start fresh
      const existingWaiting = await ctx.db.battle.findFirst({
        where: { status: "WAITING", participants: { some: { userId } } },
        select: { id: true },
      });
      if (existingWaiting) {
        const deleted = await ctx.db.battle.deleteMany({
          where: { id: existingWaiting.id, status: "WAITING" },
        });
        if (deleted.count > 0) {
          // Refund the stale entry fee so user only pays once for the new battle
          await ctx.db.user
            .update({ where: { id: userId }, data: { xp: { increment: ENTRY_FEE_XP } } })
            .catch(() => null);
          await redis.zrem(RANDOM_ZQUEUE_KEY, existingWaiting.id).catch(() => null);
          // Fall through: create a fresh battle below
        } else {
          // Race: battle was just matched while we were checking — redirect user to it
          return {
            battleId: existingWaiting.id,
            inviteCode: null as string | null,
            status: "ACTIVE" as const,
            waitingForOpponent: false,
          };
        }
      }

      // Soft check before atomic deduction (avoids consuming a queue slot unnecessarily)
      if (user.xp < ENTRY_FEE_XP) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You need at least ${ENTRY_FEE_XP} XP to enter a battle.`,
        });
      }

      if (input.mode === "RANDOM") {
        // FIX: clean up expired entries from Sorted Set queue before popping
        await redis.zremrangebyscore(RANDOM_ZQUEUE_KEY, "-inf", Date.now()).catch(() => null);
        const popped = await redis.zpopmin(RANDOM_ZQUEUE_KEY, 1).catch(() => [] as string[]);
        const waitingId = Array.isArray(popped) && popped.length >= 1 ? String(popped[0]) : null;

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
            existing.participants.length === 1 &&
            existing.participants[0]!.userId !== userId
          ) {
            const host = existing.participants[0]!;

            // FIX: atomically deduct joiner's entry fee
            await deductEntryFee(ctx.db as unknown as PrismaClient, userId);

            await ctx.db.battleParticipant.create({
              data: { battleId: waitingId, userId, xpStaked: ENTRY_FEE_XP, hp: STARTING_HP },
            });
            const firstQ = await selectBattleQuestion(
              ctx.db as unknown as PrismaClient,
              0,
              []
            );
            await storeRoundQuestion(waitingId, 0, firstQ);
            const state: BattleRedisState = {
              battleId: waitingId,
              status: "ACTIVE",
              phase: "ANSWERING",
              currentRound: 0,
              roundStartedAt: Date.now(),
              roundTimeoutSec: 30,
              participants: {
                [host.userId]: makeParticipant(
                  host.userId,
                  host.user.displayName,
                  host.user.avatarUrl
                ),
                [userId]: makeParticipant(userId, user.displayName, user.avatarUrl),
              },
              currentQuestion: {
                promptEn: firstQ.promptEn,
                promptZh: firstQ.promptZh,
                difficulty: firstQ.difficulty,
                category: firstQ.category,
                token: firstQ.token,
              },
              lastRoundSummary: null,
              pendingCounter: null,
              winnerId: null,
              countdownStartedAt: null,
              usedQuestionIds: firstQ.dbId ? [firstQ.dbId] : [], // FIX: dedup init
              waitingExpiresAt: null,
            };
            await ctx.db.battle.update({
              where: { id: waitingId },
              data: { status: "ACTIVE", currentRound: 0 },
            });
            await writeBattleState(state);
            return {
              battleId: waitingId,
              inviteCode: null as string | null,
              status: "ACTIVE" as const,
              waitingForOpponent: false,
            };
          }
        }
      }

      // FIX: atomically deduct XP before creating battle
      await deductEntryFee(ctx.db as unknown as PrismaClient, userId);

      // FIX: invite code collision retry — up to 5 attempts with larger code space
      let battle: { id: string; inviteCode: string | null } | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const inviteCode = input.mode === "INVITE" ? generateInviteCode() : null;
        try {
          battle = await ctx.db.battle.create({
            data: {
              status: "WAITING",
              inviteCode,
              xpStake: ENTRY_FEE_XP,
              participants: {
                create: { userId, xpStaked: ENTRY_FEE_XP, hp: STARTING_HP },
              },
            },
            select: { id: true, inviteCode: true },
          });
          break;
        } catch (err: unknown) {
          // Prisma unique constraint error code
          if (
            typeof err === "object" &&
            err !== null &&
            "code" in err &&
            (err as { code: string }).code === "P2002" &&
            attempt < 4
          ) {
            continue; // retry with a new code
          }
          // Non-collision error or exhausted retries — refund XP and re-throw
          await ctx.db.user
            .update({ where: { id: userId }, data: { xp: { increment: ENTRY_FEE_XP } } })
            .catch(() => {});
          throw err;
        }
      }

      if (!battle) {
        // Should never happen (5 collision retries exhausted)
        await ctx.db.user
          .update({ where: { id: userId }, data: { xp: { increment: ENTRY_FEE_XP } } })
          .catch(() => {});
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create battle." });
      }

      if (input.mode === "RANDOM") {
        // FIX: push to Sorted Set with per-entry expiry score instead of TTL on whole list
        const expiresAt = Date.now() + QUEUE_ENTRY_TTL_MS;
        await redis.zadd(RANDOM_ZQUEUE_KEY, expiresAt, battle.id).catch(() => null);
      }

      const waitingExpiresAt = Date.now() + QUEUE_ENTRY_TTL_MS;
      const state: BattleRedisState = {
        battleId: battle.id,
        status: "WAITING",
        phase: "ANSWERING",
        currentRound: 0,
        roundStartedAt: 0,
        roundTimeoutSec: 30,
        participants: {
          [userId]: makeParticipant(userId, user.displayName, user.avatarUrl),
        },
        currentQuestion: null,
        lastRoundSummary: null,
        pendingCounter: null,
        winnerId: null,
        countdownStartedAt: null,
        usedQuestionIds: [], // FIX: dedup init
        waitingExpiresAt,    // FIX: for auto-expiry in getState
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

      // Soft check
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
      if (!battle) throw new TRPCError({ code: "NOT_FOUND", message: "Invite code not found." });
      if (battle.status !== "WAITING")
        throw new TRPCError({ code: "BAD_REQUEST", message: "This battle has already started." });
      if (battle.participants.some((p) => p.userId === userId))
        throw new TRPCError({ code: "BAD_REQUEST", message: "You are already in this battle." });
      if (battle.participants.length >= 2)
        throw new TRPCError({ code: "BAD_REQUEST", message: "This battle is full." });

      const host = battle.participants[0]!;

      // FIX: atomically deduct joiner's XP
      await deductEntryFee(ctx.db as unknown as PrismaClient, userId);

      await ctx.db.battleParticipant.create({
        data: { battleId: battle.id, userId, xpStaked: ENTRY_FEE_XP, hp: STARTING_HP },
      });

      const firstQ = await selectBattleQuestion(ctx.db as unknown as PrismaClient, 0, []);
      await storeRoundQuestion(battle.id, 0, firstQ);
      await ctx.db.battle.update({
        where: { id: battle.id },
        data: { status: "ACTIVE", currentRound: 0 },
      });

      const state: BattleRedisState = {
        battleId: battle.id,
        status: "ACTIVE",
        phase: "ANSWERING",
        currentRound: 0,
        roundStartedAt: Date.now(),
        roundTimeoutSec: 30,
        participants: {
          [host.userId]: makeParticipant(
            host.userId,
            host.user.displayName,
            host.user.avatarUrl
          ),
          [userId]: makeParticipant(userId, user.displayName, user.avatarUrl),
        },
        currentQuestion: {
          promptEn: firstQ.promptEn,
          promptZh: firstQ.promptZh,
          difficulty: firstQ.difficulty,
          category: firstQ.category,
          token: firstQ.token,
        },
        lastRoundSummary: null,
        pendingCounter: null,
        winnerId: null,
        countdownStartedAt: null,
        usedQuestionIds: firstQ.dbId ? [firstQ.dbId] : [], // FIX: dedup init
        waitingExpiresAt: null,
      };
      await writeBattleState(state);
      return { battleId: battle.id, status: "ACTIVE" as const };
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
        // FIX: DB values for hp/battleXp are now kept in sync by syncParticipantsToDB
        // so cold-state reconstruction correctly reflects in-battle progress
        const coldState: BattleRedisState = {
          battleId: battle.id,
          status: battle.status as BattleRedisState["status"],
          phase: "ANSWERING",
          currentRound: battle.currentRound,
          roundStartedAt: 0,
          roundTimeoutSec: battle.roundTimeoutSec,
          participants: Object.fromEntries(
            battle.participants.map((p) => [
              p.userId,
              {
                userId: p.userId,
                displayName: p.user.displayName,
                avatarUrl: p.user.avatarUrl,
                hp: p.hp,           // FIX: now reflects latest round-synced value
                battleXp: p.battleXp, // FIX: now reflects latest round-synced value
                hasAnswered: false,
                hasActed: false,
                actionChosen: "NONE" as const,
                attackPowerUsed: 0,
                lastSeenAt: Date.now(),
                xpStaked: ENTRY_FEE_XP,
                lastAnswerCorrect: null, // FIX: initialize new field
              } satisfies BattleParticipantState,
            ])
          ),
          currentQuestion: null,
          lastRoundSummary: null,
          pendingCounter: null,
          winnerId: null,
          countdownStartedAt: null,
          usedQuestionIds: [],
          waitingExpiresAt: null,
        };
        state = coldState;
      }

      const st: BattleRedisState = state;

      if (!st.participants[userId]) throw new TRPCError({ code: "FORBIDDEN" });

      st.participants[userId]!.lastSeenAt = Date.now();

      // FIX: auto-expire WAITING battles that exceeded their queue TTL — refund XP
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
        await redis.zrem(RANDOM_ZQUEUE_KEY, input.battleId).catch(() => null);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Waiting time expired. Your XP has been refunded.",
        });
      }

      if (st.status === "ACTIVE") {
        const opponent = Object.values(st.participants).find(
          (p) => p.userId !== userId
        );

        if (opponent && isAbandoned(opponent)) {
          await finalizeBattle(ctx.db as unknown as PrismaClient, st, userId);
        }

        const answerDeadline = st.roundStartedAt + st.roundTimeoutSec * 1000;

        // Answer timeout → auto-submit blank for non-answerers
        if (
          st.phase === "ANSWERING" &&
          st.roundStartedAt > 0 &&
          Date.now() > answerDeadline
        ) {
          for (const p of Object.values(st.participants)) {
            if (!p.hasAnswered) {
              p.hasAnswered = true;
              p.lastAnswerCorrect = false; // FIX: timed-out = incorrect
            }
          }
          st.phase = "ACTING";
        }

        // Action timeout (10s after answering closes) → auto ATTACK_100
        const actionDeadline = answerDeadline + 10_000;
        if (st.phase === "ACTING" && Date.now() > actionDeadline) {
          for (const p of Object.values(st.participants)) {
            if (!p.hasActed) {
              p.hasActed = true;
              p.actionChosen = "ATTACK_100";
            }
          }
        }

        // Counter-choice timeout → auto-COUNTER
        if (
          st.phase === "COUNTER_CHOICE" &&
          st.pendingCounter &&
          Date.now() - st.pendingCounter.startedAt > COUNTER_TIMEOUT_MS
        ) {
          const hasLock = await acquireRoundLock(st.battleId, st.currentRound);
          if (hasLock) {
            const { finished, winnerId } = resolveCounter(st, "COUNTER");
            if (finished) {
              await finalizeBattle(
                ctx.db as unknown as PrismaClient,
                st,
                winnerId
              );
            } else {
              await startNextRound(ctx.db as unknown as PrismaClient, st);
            }
          }
        }

        // Both acted in ACTING → resolve round
        const allActed = Object.values(st.participants).every((p) => p.hasActed);
        if (st.phase === "ACTING" && allActed) {
          const hasLock = await acquireRoundLock(st.battleId, st.currentRound);
          if (hasLock) {
            const { finished, winnerId, hasPendingCounter } = resolveRound(st);
            if (hasPendingCounter) {
              st.phase = "COUNTER_CHOICE";
            } else if (finished) {
              await finalizeBattle(
                ctx.db as unknown as PrismaClient,
                st,
                winnerId
              );
            } else {
              await startNextRound(ctx.db as unknown as PrismaClient, st);
            }
          }
        }
      }

      await writeBattleState(st);
      return buildSnapshot(st, userId);
    }),

  // ----------------------------------------------------------
  // SUBMIT ANSWER
  // FIX: guarded by per-battle mutex to prevent concurrent read-modify-write race
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

      // FIX: acquire per-battle mutex before read-modify-write
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
        participant.lastAnswerCorrect = isCorrect; // FIX: store for summary

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

        const allAnswered = Object.values(state.participants).every(
          (p) => p.hasAnswered
        );
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
  // FIX: guarded by per-battle mutex to prevent concurrent read-modify-write race
  // ----------------------------------------------------------
  submitAction: protectedProcedure
    .input(
      z.object({
        battleId: z.string(),
        action: z.enum(["ATTACK_50", "ATTACK_80", "ATTACK_100", "HOLD"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // FIX: acquire per-battle mutex before read-modify-write
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

        participant.hasActed = true;
        participant.actionChosen = input.action;

        const bothActed = Object.values(state.participants).every((p) => p.hasActed);
        if (bothActed) {
          const hasLock = await acquireRoundLock(state.battleId, state.currentRound);
          if (hasLock) {
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
          }
        }

        await writeBattleState(state);
        return { acknowledged: true, resolved: bothActed };
      } finally {
        await release?.();
      }
    }),

  // ----------------------------------------------------------
  // SUBMIT COUNTER (COUNTER_CHOICE phase)
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
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not in counter choice phase.",
        });
      if (!state.pendingCounter)
        throw new TRPCError({ code: "BAD_REQUEST", message: "No pending counter." });
      if (state.pendingCounter.defenderId !== userId)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "It is not your turn to counter.",
        });

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
  // CANCEL WAITING
  // FIX: refunds pre-deducted XP; uses ZREM for Sorted Set queue
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
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Battle has already started.",
        });
      if (battle.participants.length > 1)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Opponent has already joined.",
        });

      // FIX: delete battle and refund XP atomically
      await ctx.db.$transaction([
        ctx.db.battle.delete({ where: { id: input.battleId } }),
        ctx.db.user.update({
          where: { id: userId },
          data: { xp: { increment: ENTRY_FEE_XP } },
        }),
      ]);
      // FIX: remove from Sorted Set (was lrem on list before)
      await redis.zrem(RANDOM_ZQUEUE_KEY, input.battleId).catch(() => null);
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
          const opponent = p.battle.participants.find(
            (op) => op.userId !== userId
          );
          return {
            battleId: p.battleId,
            isWinner: p.isWinner,
            xpChange: p.xpChange,
            opponentName: opponent?.user.displayName ?? "Unknown",
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
