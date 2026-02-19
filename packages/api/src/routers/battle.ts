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
  type BattleRedisState,
  type BattleParticipantState,
  type BattleQuestionState,
} from "../battle-state";
import { redis } from "../redis";

const RANDOM_QUEUE_KEY = "battle:matchmaking:queue";
const DOMAINS = [
  "ARITHMETIC", "ALGEBRA", "GEOMETRY", "FRACTIONS", "WORD_PROBLEMS",
] as const;

// ============================================================
// HELPER: select a question for a battle round
// ============================================================
async function selectBattleQuestion(
  db: PrismaClient,
  round: number
): Promise<BattleQuestionState> {
  const useAdaptive = Math.random() < 0.3;

  if (!useAdaptive) {
    try {
      const count = await db.question.count({ where: { isPublished: true } });
      if (count > 0) {
        const skip = Math.floor(Math.random() * count);
        const q = await db.question.findFirst({
          where: { isPublished: true },
          skip,
        });
        if (q) {
          return {
            token: randomUUID(),
            promptEn: q.contentEn,
            promptZh: q.contentZh,
            difficulty: q.difficulty,
            category: q.category,
            answer: q.answer,
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
// HELPER: transfer XP and mark battle finished in DB
// ============================================================
async function finalizeBattle(
  db: PrismaClient,
  state: BattleRedisState,
  winnerId: string | null
): Promise<void> {
  state.status = "FINISHED";
  state.phase = "FINISHED";
  state.winnerId = winnerId;

  try {
    const participantIds = Object.keys(state.participants);
    const loserId = participantIds.find((id) => id !== winnerId) ?? null;

    if (winnerId && loserId) {
      const loser = await db.user.findUnique({
        where: { id: loserId },
        select: { xp: true },
      });
      const stake = state.participants[loserId]?.xpStaked ?? ENTRY_FEE_XP;
      const loserDeduction = Math.min(stake, Math.max(0, loser?.xp ?? 0));
      const winnerGain = loserDeduction;

      await Promise.all([
        db.user.update({
          where: { id: winnerId },
          data: { xp: { increment: winnerGain }, battlesWon: { increment: 1 }, battlesPlayed: { increment: 1 } },
        }),
        db.user.update({
          where: { id: loserId },
          data: { xp: { decrement: loserDeduction }, battlesPlayed: { increment: 1 } },
        }),
        db.battleParticipant.update({
          where: { battleId_userId: { battleId: state.battleId, userId: winnerId } },
          data: { isWinner: true, xpChange: winnerGain, hp: state.participants[winnerId]?.hp ?? 0 },
        }),
        db.battleParticipant.update({
          where: { battleId_userId: { battleId: state.battleId, userId: loserId } },
          data: { isWinner: false, xpChange: -loserDeduction, hp: state.participants[loserId]?.hp ?? 0 },
        }),
        db.battle.update({
          where: { id: state.battleId },
          data: { status: "FINISHED", finishedAt: new Date(), currentRound: state.currentRound },
        }),
      ]);
    } else {
      await db.battle.update({
        where: { id: state.battleId },
        data: { status: "FINISHED", finishedAt: new Date() },
      });
    }
  } catch (err) {
    console.error("[Battle] finalizeBattle error:", err);
  }
}

// ============================================================
// HELPER: advance to next answering round
// ============================================================
async function startNextRound(
  db: PrismaClient,
  state: BattleRedisState
): Promise<void> {
  const nextQ = await selectBattleQuestion(db, state.currentRound);
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
  await db.battle.update({
    where: { id: state.battleId },
    data: { currentRound: state.currentRound },
  });
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
  } | null;
  opponent: {
    displayName: string;
    avatarUrl: string | null;
    hp: number;
    hasAnswered: boolean;
    hasActed: boolean;
  } | null;
  currentQuestion: Omit<BattleQuestionState, "answer"> | null;
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
    currentQuestion: state.currentQuestion,
    lastRoundSummary: state.lastRoundSummary,
    counterChoice,
    winnerId: state.winnerId,
  };
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
      if (user.xp < ENTRY_FEE_XP) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You need at least ${ENTRY_FEE_XP} XP to enter a battle.`,
        });
      }

      if (input.mode === "RANDOM") {
        const waitingId = await redis.lpop(RANDOM_QUEUE_KEY).catch(() => null);
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
            await ctx.db.battleParticipant.create({
              data: { battleId: waitingId, userId, xpStaked: ENTRY_FEE_XP, hp: STARTING_HP },
            });
            const firstQ = await selectBattleQuestion(
              ctx.db as unknown as PrismaClient,
              0
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
                [host.userId]: {
                  userId: host.userId,
                  displayName: host.user.displayName,
                  avatarUrl: host.user.avatarUrl,
                  hp: STARTING_HP,
                  battleXp: 0,
                  hasAnswered: false,
                  hasActed: false,
                  actionChosen: "NONE",
                  attackPowerUsed: 0,
                  lastSeenAt: Date.now(),
                  xpStaked: ENTRY_FEE_XP,
                } satisfies BattleParticipantState,
                [userId]: {
                  userId,
                  displayName: user.displayName,
                  avatarUrl: user.avatarUrl,
                  hp: STARTING_HP,
                  battleXp: 0,
                  hasAnswered: false,
                  hasActed: false,
                  actionChosen: "NONE",
                  attackPowerUsed: 0,
                  lastSeenAt: Date.now(),
                  xpStaked: ENTRY_FEE_XP,
                } satisfies BattleParticipantState,
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

      const inviteCode = input.mode === "INVITE" ? generateInviteCode() : null;
      const battle = await ctx.db.battle.create({
        data: {
          status: "WAITING",
          inviteCode,
          xpStake: ENTRY_FEE_XP,
          participants: {
            create: { userId, xpStaked: ENTRY_FEE_XP, hp: STARTING_HP },
          },
        },
      });

      if (input.mode === "RANDOM") {
        await redis.rpush(RANDOM_QUEUE_KEY, battle.id).catch(() => null);
        await redis.expire(RANDOM_QUEUE_KEY, 300).catch(() => null);
      }

      const state: BattleRedisState = {
        battleId: battle.id,
        status: "WAITING",
        phase: "ANSWERING",
        currentRound: 0,
        roundStartedAt: 0,
        roundTimeoutSec: 30,
        participants: {
          [userId]: {
            userId,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            hp: STARTING_HP,
            battleXp: 0,
            hasAnswered: false,
            hasActed: false,
            actionChosen: "NONE",
            attackPowerUsed: 0,
            lastSeenAt: Date.now(),
            xpStaked: ENTRY_FEE_XP,
          } satisfies BattleParticipantState,
        },
        currentQuestion: null,
        lastRoundSummary: null,
        pendingCounter: null,
        winnerId: null,
        countdownStartedAt: null,
      };
      await writeBattleState(state);

      return {
        battleId: battle.id,
        inviteCode,
        status: "WAITING" as const,
        waitingForOpponent: true,
      };
    }),

  // ----------------------------------------------------------
  // JOIN
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
      if (!battle) throw new TRPCError({ code: "NOT_FOUND", message: "Invite code not found." });
      if (battle.status !== "WAITING")
        throw new TRPCError({ code: "BAD_REQUEST", message: "This battle has already started." });
      if (battle.participants.some((p) => p.userId === userId))
        throw new TRPCError({ code: "BAD_REQUEST", message: "You are already in this battle." });
      if (battle.participants.length >= 2)
        throw new TRPCError({ code: "BAD_REQUEST", message: "This battle is full." });

      const host = battle.participants[0]!;
      await ctx.db.battleParticipant.create({
        data: { battleId: battle.id, userId, xpStaked: ENTRY_FEE_XP, hp: STARTING_HP },
      });

      const firstQ = await selectBattleQuestion(ctx.db as unknown as PrismaClient, 0);
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
          [host.userId]: {
            userId: host.userId,
            displayName: host.user.displayName,
            avatarUrl: host.user.avatarUrl,
            hp: STARTING_HP,
            battleXp: 0,
            hasAnswered: false,
            hasActed: false,
            actionChosen: "NONE",
            attackPowerUsed: 0,
            lastSeenAt: Date.now(),
            xpStaked: ENTRY_FEE_XP,
          } satisfies BattleParticipantState,
          [userId]: {
            userId,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            hp: STARTING_HP,
            battleXp: 0,
            hasAnswered: false,
            hasActed: false,
            actionChosen: "NONE",
            attackPowerUsed: 0,
            lastSeenAt: Date.now(),
            xpStaked: ENTRY_FEE_XP,
          } satisfies BattleParticipantState,
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
                hp: p.hp,
                battleXp: p.battleXp,
                hasAnswered: false,
                hasActed: false,
                actionChosen: "NONE" as const,
                attackPowerUsed: 0,
                lastSeenAt: Date.now(),
                xpStaked: ENTRY_FEE_XP,
              } satisfies BattleParticipantState,
            ])
          ),
          currentQuestion: null,
          lastRoundSummary: null,
          pendingCounter: null,
          winnerId: null,
          countdownStartedAt: null,
        };
        state = coldState;
      }

      const st: BattleRedisState = state;

      if (!st.participants[userId]) throw new TRPCError({ code: "FORBIDDEN" });

      st.participants[userId]!.lastSeenAt = Date.now();

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
              // battleXp unchanged — they just don't earn anything new
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
      participant.battleXp += battleXpGained; // XP accumulates!

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
    }),

  // ----------------------------------------------------------
  // SUBMIT ACTION (ACTING phase)
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

      await ctx.db.battle.delete({ where: { id: input.battleId } });
      await redis.lrem(RANDOM_QUEUE_KEY, 0, input.battleId).catch(() => null);
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
