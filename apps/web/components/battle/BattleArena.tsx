"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useSession } from "next-auth/react";
import { PlayerHPBar } from "./PlayerHPBar";
import { QuestionCard } from "./QuestionCard";
import { ActionPanel, type OpponentTarget } from "./ActionPanel";
import { ResolutionOverlay } from "./ResolutionOverlay";
import { ResultsScreen } from "./ResultsScreen";
import { BattleStage, type BattleActionType, type CharacterType } from "./BattleStage";

interface BattleArenaProps {
  battleId: string;
  onPlayAgain: () => void;
}

// ─── Counter Choice Panel (2-player only) ──────────────────────────────────
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
      <div className="text-center mb-4">
        <p className="text-3xl mb-1">🛡️💥</p>
        <p className="text-yellow-300 font-heading font-bold text-lg">Attack Absorbed!</p>
        <p className="text-white/70 text-sm mt-1">
          You have{" "}
          <span className="text-yellow-300 font-bold">
            {defenderRemainingPower.toLocaleString()}
          </span>{" "}
          power remaining
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.button
          onClick={() => onChoice("COUNTER")}
          disabled={isSubmitting}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-violet-600 text-white font-bold py-5 px-3 rounded-2xl disabled:opacity-50 font-heading text-center shadow-lg"
        >
          <p className="text-2xl mb-1">⚡️</p>
          <p className="text-sm font-bold">Counter-Strike</p>
          <p className="text-xs opacity-90 mt-1 font-bold text-yellow-300">
            {counterDamage.toLocaleString()} HP dmg
          </p>
          <p className="text-[10px] opacity-70 mt-1">Guaranteed — bypasses defense</p>
        </motion.button>

        <motion.button
          onClick={() => onChoice("ACTIVE_ATTACK")}
          disabled={isSubmitting}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="relative overflow-hidden bg-gradient-to-br from-red-500 to-orange-500 text-white font-bold py-5 px-3 rounded-2xl disabled:opacity-50 font-heading text-center shadow-lg"
        >
          <p className="text-2xl mb-1">🔥</p>
          <p className="text-sm font-bold">Full Assault</p>
          <p className="text-xs opacity-90 mt-1 font-bold text-yellow-300">
            {activeAttackDamage.toLocaleString()} HP dmg
          </p>
          <p className="text-[10px] opacity-70 mt-1">(remaining − opponent) × 3</p>
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Multi-player opponents strip ────────────────────────────────────────────
function OpponentsStrip({
  opponents,
  maxHp,
  myUserId,
  lastSummary,
}: {
  opponents: { userId: string; displayName: string; avatarUrl: string | null; hp: number; isEliminated: boolean }[];
  maxHp: number;
  myUserId: string;
  lastSummary: { participants: Record<string, { damageReceived: number }> } | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {opponents.map((op) => {
        const dmg = lastSummary?.participants[op.userId]?.damageReceived ?? 0;
        return (
          <div
            key={op.userId}
            className={`relative bg-white/5 border rounded-xl p-3 ${
              op.isEliminated
                ? "border-red-900/40 opacity-50"
                : "border-white/10"
            }`}
          >
            {op.isEliminated && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
                <span className="text-red-400 font-heading font-bold text-sm">💀 KO</span>
              </div>
            )}
            <PlayerHPBar
              displayName={op.displayName}
              avatarUrl={op.avatarUrl}
              hp={op.hp}
              maxHp={maxHp}
              damageReceived={dmg}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Kill feed ────────────────────────────────────────────────────────────────
function KillFeed({
  kills,
  participants,
  myUserId,
}: {
  kills: { killedUserId: string; killerUserId: string | null; xpStaked: number }[];
  participants: Record<string, { displayName: string }>;
  myUserId: string;
}) {
  const recent = kills.slice(-3).reverse();
  if (recent.length === 0) return null;

  return (
    <div className="space-y-1">
      {recent.map((kill, i) => {
        const killerName =
          kill.killerUserId === myUserId
            ? "You"
            : (participants[kill.killerUserId ?? ""]?.displayName ?? "???");
        const victimName =
          kill.killedUserId === myUserId
            ? "you"
            : (participants[kill.killedUserId]?.displayName ?? "???");
        const isMe = kill.killerUserId === myUserId;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-xs font-heading px-3 py-1.5 rounded-lg ${
              isMe
                ? "bg-yellow-500/20 border border-yellow-500/30 text-yellow-300"
                : "bg-red-500/10 border border-red-500/20 text-white/60"
            }`}
          >
            ⚔️ <strong>{killerName}</strong> eliminated <strong>{victimName}</strong>
            {isMe && (
              <span className="ml-1 text-yellow-400">+{kill.xpStaked} XP</span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main Arena ────────────────────────────────────────────────────────────
export function BattleArena({ battleId, onPlayAgain }: BattleArenaProps) {
  const t = useTranslations("battle");
  const router = useRouter();
  const { data: session } = useSession();
  const myUserId = (session?.user as { id?: string })?.id ?? "";

  const [myCharacter] = useState<CharacterType>(() => {
    if (typeof window === "undefined") return "mage";
    return (localStorage.getItem("ohmygame_character") as CharacterType) || "mage";
  });

  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
    battleXpGained: number;
    correctAnswer: string | null;
  } | null>(null);
  const [showResolution, setShowResolution] = useState(false);
  const [chosenAction, setChosenAction] = useState<BattleActionType>(null);
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

  // ─── Early Leave Detection ────────────────────────────────────────────────
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);
  const [showAwayModal, setShowAwayModal] = useState(false);
  const [awayTimeElapsed, setAwayTimeElapsed] = useState(0);
  const [leaveCountdown, setLeaveCountdown] = useState(60);
  const awaySinceRef = useRef<number | null>(null);
  const leaveCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isActiveBattle = gameState?.status === "ACTIVE";
  const entryFee = gameState?.me?.xpStaked ?? 0;
  const ABANDON_SECONDS = 60;

  const isActiveBattleRef = useRef(false);
  isActiveBattleRef.current = isActiveBattle;
  const forfeitMutateRef = useRef(forfeitMutation.mutate);
  forfeitMutateRef.current = forfeitMutation.mutate;

  useEffect(() => {
    if (gameState?.status === "FINISHED" || gameState?.status === "ABANDONED") {
      setShowAwayModal(false);
      if (leaveCountdownRef.current) {
        clearInterval(leaveCountdownRef.current);
        leaveCountdownRef.current = null;
      }
    }
  }, [gameState?.status]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isActiveBattleRef.current) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isActiveBattleRef.current) return;
      if (document.hidden) {
        awaySinceRef.current = Date.now();
      } else {
        if (awaySinceRef.current !== null) {
          const elapsed = Math.floor((Date.now() - awaySinceRef.current) / 1000);
          awaySinceRef.current = null;
          setAwayTimeElapsed(elapsed);
          const remaining = Math.max(0, ABANDON_SECONDS - elapsed);
          setLeaveCountdown(remaining);
          setShowAwayModal(true);

          if (leaveCountdownRef.current) clearInterval(leaveCountdownRef.current);
          leaveCountdownRef.current = setInterval(() => {
            setLeaveCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(leaveCountdownRef.current!);
                leaveCountdownRef.current = null;
                forfeitMutateRef.current({ battleId });
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (leaveCountdownRef.current) {
        clearInterval(leaveCountdownRef.current);
        leaveCountdownRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      if (!isActiveBattleRef.current) return;
      const anchor = (e.target as Element).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || href.includes("/battle/")) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingNavUrl(href);
    };
    document.addEventListener("click", handleLinkClick, true);
    return () => document.removeEventListener("click", handleLinkClick, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show resolution overlay on round transition
  useEffect(() => {
    if (!gameState) return;
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

    if (gameState.phase === "ANSWERING" && prevRound !== gameState.currentRound) {
      setLastResult(null);
      setChosenAction(null);
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

  const maxPlayers = gameState.maxPlayers ?? 2;
  const maxHp = maxPlayers * 1000;
  const isMultiplayer = maxPlayers > 2;

  if (gameState.status === "FINISHED" || gameState.status === "ABANDONED") {
    const isWinner = gameState.winnerId === myUserId;
    const firstOpponent = gameState.opponents[0];
    const opponentName = isMultiplayer
      ? `${gameState.opponents.length} opponents`
      : (firstOpponent?.displayName ?? "Opponent");

    return (
      <ResultsScreen
        isWinner={isWinner}
        xpChange={gameState.me?.xpChange ?? (isWinner ? 1000 : -1000)}
        rounds={gameState.currentRound}
        opponentName={opponentName}
        myFinalHp={gameState.me?.hp ?? 0}
        opponentFinalHp={firstOpponent?.hp ?? 0}
        onPlayAgain={onPlayAgain}
      />
    );
  }

  const me = gameState.me;
  const opponents = gameState.opponents;
  // For 2-player stage animations
  const firstOpponent = opponents[0] ?? null;
  const lastRoundDamageToMe =
    gameState.lastRoundSummary?.participants[myUserId]?.damageReceived ?? 0;
  const myLastAction = (gameState.lastRoundSummary?.participants[myUserId]?.action ?? null) as BattleActionType;
  const opponentLastAction = (Object.entries(gameState.lastRoundSummary?.participants ?? {})
    .find(([id]) => id !== myUserId)?.[1]?.action ?? null) as BattleActionType;

  // Opponents as targets for ActionPanel
  const opponentTargets: OpponentTarget[] = opponents
    .filter((o) => !o.isEliminated)
    .map((o) => ({
      userId: o.userId,
      displayName: o.displayName,
      hp: o.hp,
      isEliminated: o.isEliminated,
    }));

  // Build participant display map for kill feed
  const allParticipantsDisplay: Record<string, { displayName: string }> = { [myUserId]: { displayName: "You" } };
  for (const op of opponents) {
    allParticipantsDisplay[op.userId] = { displayName: op.displayName };
  }

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
            {isMultiplayer && (
              <span className="ml-2 text-sm text-white/50">
                {opponents.filter((o) => !o.isEliminated).length + (me?.isEliminated ? 0 : 1)} alive
              </span>
            )}
          </span>
        </motion.div>

        {/* HP section */}
        {isMultiplayer ? (
          <div className="space-y-3">
            {/* My HP */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <PlayerHPBar
                displayName="You"
                hp={me?.hp ?? 0}
                maxHp={maxHp}
                isMe
                hasAnswered={me?.hasAnswered ?? false}
                damageReceived={lastRoundDamageToMe}
              />
            </div>
            {/* Opponents grid */}
            {opponents.length > 0 && (
              <OpponentsStrip
                opponents={opponents}
                maxHp={maxHp}
                myUserId={myUserId}
                lastSummary={gameState.lastRoundSummary}
              />
            )}
          </div>
        ) : (
          /* Classic 2-player side-by-side */
          <div className="flex items-start justify-between gap-4 px-2">
            {me && (
              <PlayerHPBar
                displayName="You"
                hp={me.hp}
                maxHp={maxHp}
                isMe
                hasAnswered={me.hasAnswered}
                damageReceived={lastRoundDamageToMe}
              />
            )}
            <div className="text-white text-3xl font-bold self-center">⚔️</div>
            {firstOpponent && (
              <PlayerHPBar
                displayName={firstOpponent.displayName}
                avatarUrl={firstOpponent.avatarUrl}
                hp={firstOpponent.hp}
                maxHp={maxHp}
                hasAnswered={firstOpponent.hasAnswered}
              />
            )}
          </div>
        )}

        {/* Kill feed (multi-player) */}
        {isMultiplayer && gameState.kills.length > 0 && (
          <KillFeed
            kills={gameState.kills}
            participants={allParticipantsDisplay}
            myUserId={myUserId}
          />
        )}

        {/* Battle Stage — only for 2-player (character animations) */}
        {!isMultiplayer && (
          <BattleStage
            phase={gameState.phase}
            myAction={showResolution ? myLastAction : chosenAction}
            opponentAction={showResolution ? opponentLastAction : null}
            myHpRatio={(me?.hp ?? maxHp) / maxHp}
            opponentHpRatio={(firstOpponent?.hp ?? maxHp) / maxHp}
            showingResolution={showResolution}
            myCharacter={myCharacter}
          />
        )}

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
                submitAnswerMutation.mutate({ battleId, answer, responseTimeMs: timeMs })
              }
              isSubmitting={submitAnswerMutation.isPending}
              lastResult={lastResult}
            />
          )}

          {/* ACTING */}
          {gameState.phase === "ACTING" && !me?.isEliminated && (
            <ActionPanel
              key="action"
              battleXp={me?.battleXp ?? 0}
              hasActed={me?.hasActed ?? false}
              onAction={(action, targetUserId) => {
                setChosenAction(action as BattleActionType);
                submitActionMutation.mutate({ battleId, action, targetUserId });
              }}
              isSubmitting={submitActionMutation.isPending}
              opponents={opponentTargets}
            />
          )}

          {/* Eliminated during ACTING */}
          {gameState.phase === "ACTING" && me?.isEliminated && (
            <motion.div
              key="eliminated"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-white/60 font-heading py-8"
            >
              <div className="text-5xl mb-3">💀</div>
              <p className="text-red-400 font-bold text-lg">You were eliminated!</p>
              <p className="text-white/40 text-sm mt-2">Watching the battle unfold...</p>
            </motion.div>
          )}

          {/* COUNTER_CHOICE (2-player only) */}
          {gameState.phase === "COUNTER_CHOICE" && gameState.counterChoice && (
            <CounterPanel
              key="counter"
              isDefender={gameState.counterChoice.isDefender}
              defenderRemainingPower={gameState.counterChoice.defenderRemainingPower}
              attackerCurrentPower={gameState.counterChoice.attackerCurrentPower}
              counterDamage={gameState.counterChoice.counterDamage}
              activeAttackDamage={gameState.counterChoice.activeAttackDamage}
              onChoice={(action) => submitCounterMutation.mutate({ battleId, action })}
              isSubmitting={submitCounterMutation.isPending}
            />
          )}

          {/* Resolving / generic waiting */}
          {(gameState.phase === "RESOLVING" || gameState.phase === "FINISHED") && (
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
          <div className="text-center pt-2 space-y-2">
            <p className="text-white/25 text-[11px] font-heading">
              ⚠️ Switching tabs or refreshing will forfeit your{" "}
              <span className="text-yellow-500/50 font-bold">
                {entryFee.toLocaleString()} XP
              </span>{" "}
              entry fee
            </p>
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

      {/* ─── Away Warning Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAwayModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.85, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 24 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="bg-slate-800 border border-red-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="text-center mb-4">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                  className="text-5xl mb-2"
                >
                  ⚠️
                </motion.div>
                <h2 className="text-red-400 font-heading font-bold text-xl">
                  You Left the Battle!
                </h2>
                <p className="text-white/50 text-sm mt-1">
                  You were away for{" "}
                  <span className="text-orange-400 font-bold">{awayTimeElapsed}s</span>
                </p>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4 text-center">
                <p className="text-white/60 text-xs mb-1">Entry Fee at stake</p>
                <p className="text-yellow-400 font-bold text-2xl font-heading">
                  {entryFee.toLocaleString()} XP
                </p>
                <p className="text-red-400 text-xs mt-2 font-heading">
                  {isMultiplayer
                    ? "You will be eliminated from the battle!"
                    : "Will be forfeited to your opponent!"}
                </p>
              </div>

              <div className="text-center mb-5">
                {leaveCountdown > 0 ? (
                  <>
                    <p className="text-white/40 text-xs mb-1 font-heading">Auto-forfeit in</p>
                    <motion.p
                      key={leaveCountdown}
                      initial={{ scale: 1.4, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`text-5xl font-bold font-heading ${
                        leaveCountdown <= 10 ? "text-red-400" : "text-orange-400"
                      }`}
                    >
                      {leaveCountdown}
                    </motion.p>
                    <p className="text-white/30 text-xs mt-1 font-heading">seconds</p>
                  </>
                ) : (
                  <motion.p
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="text-red-400 font-heading font-bold text-lg"
                  >
                    Forfeiting...
                  </motion.p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setShowAwayModal(false);
                    if (leaveCountdownRef.current) {
                      clearInterval(leaveCountdownRef.current);
                      leaveCountdownRef.current = null;
                    }
                  }}
                  className="bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold py-3 px-4 rounded-2xl font-heading text-sm shadow-lg"
                >
                  ✅ Stay &amp; Fight!
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    if (leaveCountdownRef.current) {
                      clearInterval(leaveCountdownRef.current);
                      leaveCountdownRef.current = null;
                    }
                    setShowAwayModal(false);
                    forfeitMutation.mutate({ battleId });
                  }}
                  className="bg-white/8 border border-white/15 text-white/50 font-bold py-3 px-4 rounded-2xl font-heading text-sm hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors"
                >
                  Leave
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Navigation Leave Confirm Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {pendingNavUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.85, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 24 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="bg-slate-800 border border-orange-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="text-center mb-4">
                <div className="text-5xl mb-2">🚪</div>
                <h2 className="text-orange-400 font-heading font-bold text-xl">
                  Leave the Battle?
                </h2>
                <p className="text-white/50 text-sm mt-1">
                  Navigating away counts as a forfeit
                </p>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 mb-5 text-center">
                <p className="text-white/60 text-xs mb-1">Your Entry Fee</p>
                <p className="text-yellow-400 font-bold text-2xl font-heading">
                  {entryFee.toLocaleString()} XP
                </p>
                <p className="text-orange-400 text-xs mt-2 font-heading">
                  {isMultiplayer
                    ? "You will be eliminated and lose your entry fee"
                    : "will be transferred to your opponent"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setPendingNavUrl(null)}
                  className="bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold py-3 px-4 rounded-2xl font-heading text-sm shadow-lg"
                >
                  ✅ Stay &amp; Fight!
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    const url = pendingNavUrl;
                    setPendingNavUrl(null);
                    forfeitMutateRef.current({ battleId });
                    router.push(url);
                  }}
                  className="bg-white/8 border border-white/15 text-white/50 font-bold py-3 px-4 rounded-2xl font-heading text-sm hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors"
                >
                  Leave &amp; Forfeit
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
