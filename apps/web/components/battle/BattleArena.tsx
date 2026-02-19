"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useSession } from "next-auth/react";
import { PlayerHPBar } from "./PlayerHPBar";
import { QuestionCard } from "./QuestionCard";
import { ActionPanel } from "./ActionPanel";
import { ResolutionOverlay } from "./ResolutionOverlay";
import { ResultsScreen } from "./ResultsScreen";

interface BattleArenaProps {
  battleId: string;
  onPlayAgain: () => void;
}

// ─── Counter Choice Panel ──────────────────────────────────────────────────
interface CounterPanelProps {
  isDefender: boolean;
  defenderRemainingPower: number;
  attackerCurrentPower: number;
  counterDamage: number;
  activeAttackDamage: number;
  onChoice: (action: "COUNTER" | "ACTIVE_ATTACK") => void;
  isSubmitting: boolean;
}

function CounterPanel({
  isDefender,
  defenderRemainingPower,
  counterDamage,
  activeAttackDamage,
  onChoice,
  isSubmitting,
}: CounterPanelProps) {
  if (!isDefender) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center"
      >
        <p className="text-4xl mb-3">⚡</p>
        <p className="text-white font-heading font-bold text-lg mb-1">
          Your attack was absorbed!
        </p>
        <p className="text-white/60 text-sm font-heading animate-pulse">
          Waiting for opponent&apos;s counter...
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-yellow-400/40"
    >
      {/* Header */}
      <div className="text-center mb-4">
        <p className="text-3xl mb-1">🛡️💥</p>
        <p className="text-yellow-300 font-heading font-bold text-lg">
          Attack Absorbed!
        </p>
        <p className="text-white/70 text-sm mt-1">
          You have{" "}
          <span className="text-yellow-300 font-bold">
            {defenderRemainingPower.toLocaleString()}
          </span>{" "}
          power remaining
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* COUNTER */}
        <motion.button
          onClick={() => onChoice("COUNTER")}
          disabled={isSubmitting}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-violet-600 text-white font-bold py-5 px-3 rounded-2xl disabled:opacity-50 font-heading text-center shadow-lg"
        >
          <motion.div
            className="absolute inset-0 bg-white/10"
            animate={{ opacity: [0, 0.2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <p className="text-2xl mb-1">⚡️</p>
          <p className="text-sm font-bold">Counter-Strike</p>
          <p className="text-xs opacity-90 mt-1 font-bold text-yellow-300">
            {counterDamage.toLocaleString()} HP dmg
          </p>
          <p className="text-[10px] opacity-70 mt-1">
            Guaranteed — bypasses defense
          </p>
        </motion.button>

        {/* ACTIVE ATTACK */}
        <motion.button
          onClick={() => onChoice("ACTIVE_ATTACK")}
          disabled={isSubmitting}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="relative overflow-hidden bg-gradient-to-br from-red-500 to-orange-500 text-white font-bold py-5 px-3 rounded-2xl disabled:opacity-50 font-heading text-center shadow-lg"
        >
          <motion.div
            className="absolute inset-0 bg-white/10"
            animate={{ opacity: [0, 0.2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
          />
          <p className="text-2xl mb-1">🔥</p>
          <p className="text-sm font-bold">Full Assault</p>
          <p className="text-xs opacity-90 mt-1 font-bold text-yellow-300">
            {activeAttackDamage.toLocaleString()} HP dmg
          </p>
          <p className="text-[10px] opacity-70 mt-1">
            (remaining − opponent) × 3
          </p>
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Main Arena ────────────────────────────────────────────────────────────
export function BattleArena({ battleId, onPlayAgain }: BattleArenaProps) {
  const t = useTranslations("battle");
  const { data: session } = useSession();
  const myUserId = (session?.user as { id?: string })?.id ?? "";

  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
    battleXpGained: number;
    correctAnswer: string | null;
  } | null>(null);
  const [showResolution, setShowResolution] = useState(false);
  const prevPhaseRef = useRef<string | null>(null);
  const prevRoundRef = useRef<number>(-1);

  const { data: gameState } = trpc.battle.getState.useQuery(
    { battleId },
    { refetchInterval: 1500, staleTime: 0, enabled: true }
  );

  const submitAnswerMutation = trpc.battle.submitAnswer.useMutation({
    onSuccess(data) {
      setLastResult(data);
    },
  });

  const submitActionMutation = trpc.battle.submitAction.useMutation();
  const submitCounterMutation = trpc.battle.submitCounter.useMutation();
  const forfeitMutation = trpc.battle.forfeit.useMutation();

  // Show resolution overlay on lastRoundSummary change (round transition)
  useEffect(() => {
    if (!gameState) return;
    const prevPhase = prevPhaseRef.current;
    const prevRound = prevRoundRef.current;

    if (
      gameState.phase === "ANSWERING" &&
      prevRound !== -1 &&
      prevRound !== gameState.currentRound &&
      gameState.lastRoundSummary
    ) {
      setShowResolution(true);
      const timer = setTimeout(() => setShowResolution(false), 3000);
      prevPhaseRef.current = gameState.phase;
      prevRoundRef.current = gameState.currentRound;
      return () => clearTimeout(timer);
    }

    if (
      gameState.phase === "ANSWERING" &&
      prevRound !== gameState.currentRound
    ) {
      setLastResult(null);
    }

    prevPhaseRef.current = gameState.phase;
    prevRoundRef.current = gameState.currentRound;
  }, [gameState?.phase, gameState?.currentRound, gameState?.lastRoundSummary]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="text-5xl"
        >
          ⚔️
        </motion.div>
      </div>
    );
  }

  if (gameState.status === "FINISHED" || gameState.status === "ABANDONED") {
    const isWinner = gameState.winnerId === myUserId;
    return (
      <ResultsScreen
        isWinner={isWinner}
        xpChange={isWinner ? 1000 : -1000}
        rounds={gameState.currentRound}
        opponentName={gameState.opponent?.displayName ?? "Opponent"}
        myFinalHp={gameState.me?.hp ?? 0}
        opponentFinalHp={gameState.opponent?.hp ?? 0}
        onPlayAgain={onPlayAgain}
      />
    );
  }

  const me = gameState.me;
  const opponent = gameState.opponent;
  const lastRoundDamageToMe =
    gameState.lastRoundSummary?.participants[myUserId]?.damageReceived ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900">
      {/* Background stars */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Round badge */}
        <motion.div
          key={gameState.currentRound}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <span className="inline-block bg-white/10 border border-white/20 text-white font-heading font-bold px-6 py-2 rounded-full text-lg">
            {t("roundOf")} {gameState.currentRound + 1}
          </span>
        </motion.div>

        {/* HP Bars */}
        <div className="flex items-start justify-between gap-4 px-2">
          {me && (
            <PlayerHPBar
              displayName="You"
              hp={me.hp}
              isMe
              hasAnswered={me.hasAnswered}
              damageReceived={lastRoundDamageToMe}
            />
          )}
          <div className="text-white text-3xl font-bold self-center">⚔️</div>
          {opponent && (
            <PlayerHPBar
              displayName={opponent.displayName}
              avatarUrl={opponent.avatarUrl}
              hp={opponent.hp}
              hasAnswered={opponent.hasAnswered}
            />
          )}
        </div>

        {/* Phase-specific UI */}
        <AnimatePresence mode="wait">
          {/* ANSWERING */}
          {gameState.phase === "ANSWERING" && gameState.currentQuestion && (
            <QuestionCard
              key={`q-${gameState.currentRound}`}
              promptEn={gameState.currentQuestion.promptEn}
              promptZh={gameState.currentQuestion.promptZh}
              difficulty={gameState.currentQuestion.difficulty}
              category={gameState.currentQuestion.category}
              roundNumber={gameState.currentRound}
              roundTimeRemaining={gameState.roundTimeRemaining}
              hasAnswered={me?.hasAnswered ?? false}
              onSubmit={(answer, timeMs) =>
                submitAnswerMutation.mutate({
                  battleId,
                  answer,
                  responseTimeMs: timeMs,
                })
              }
              isSubmitting={submitAnswerMutation.isPending}
              lastResult={lastResult}
            />
          )}

          {/* ACTING */}
          {gameState.phase === "ACTING" && (
            <ActionPanel
              key="action"
              battleXp={me?.battleXp ?? 0}
              hasActed={me?.hasActed ?? false}
              onAction={(action) =>
                submitActionMutation.mutate({ battleId, action })
              }
              isSubmitting={submitActionMutation.isPending}
            />
          )}

          {/* COUNTER_CHOICE */}
          {gameState.phase === "COUNTER_CHOICE" && gameState.counterChoice && (
            <CounterPanel
              key="counter"
              isDefender={gameState.counterChoice.isDefender}
              defenderRemainingPower={
                gameState.counterChoice.defenderRemainingPower
              }
              attackerCurrentPower={gameState.counterChoice.attackerCurrentPower}
              counterDamage={gameState.counterChoice.counterDamage}
              activeAttackDamage={gameState.counterChoice.activeAttackDamage}
              onChoice={(action) =>
                submitCounterMutation.mutate({ battleId, action })
              }
              isSubmitting={submitCounterMutation.isPending}
            />
          )}

          {/* RESOLVING / generic waiting */}
          {(gameState.phase === "RESOLVING" ||
            gameState.phase === "FINISHED") && (
            <motion.div
              key="resolving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-white/60 font-heading py-8"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: 3 }}
                className="text-4xl mb-3"
              >
                💥
              </motion.div>
              Resolving...
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forfeit */}
        {gameState.status === "ACTIVE" && (
          <div className="text-center pt-2">
            <button
              onClick={() => {
                if (confirm(t("forfeitConfirm"))) {
                  forfeitMutation.mutate({ battleId });
                }
              }}
              className="text-white/30 text-xs hover:text-white/60 transition-colors font-heading"
            >
              {t("forfeit")}
            </button>
          </div>
        )}
      </div>

      {/* Resolution overlay */}
      <ResolutionOverlay
        summary={gameState.lastRoundSummary}
        myUserId={myUserId}
        visible={showResolution}
      />
    </div>
  );
}
