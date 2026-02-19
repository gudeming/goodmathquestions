"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";

interface WaitingScreenProps {
  battleId: string;
  inviteCode: string | null;
  maxPlayers: number;
  onCancelled: () => void;
  onMatchFound: (battleId: string) => void;
}

export function WaitingScreen({
  battleId,
  inviteCode,
  maxPlayers,
  onCancelled,
  onMatchFound,
}: WaitingScreenProps) {
  const t = useTranslations("battle");

  const { data: state } = trpc.battle.getState.useQuery(
    { battleId },
    { refetchInterval: 1500, staleTime: 0, enabled: true }
  );

  const cancelMutation = trpc.battle.cancelWaiting.useMutation({
    onSuccess: onCancelled,
  });

  // Redirect when battle becomes active
  useEffect(() => {
    if (state?.status === "ACTIVE") {
      onMatchFound(battleId);
    }
  }, [state?.status, battleId, onMatchFound]);

  function copyCode() {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode).catch(() => null);
    }
  }

  const playerCount = state?.playerCount ?? 1;
  const spotsLeft = maxPlayers - playerCount;
  const opponents = state?.opponents ?? [];

  return (
    <div className="max-w-md mx-auto py-12 px-4 text-center space-y-6">
      {/* Animated icon */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="text-7xl mx-auto w-fit"
      >
        🧮
      </motion.div>

      <div>
        <h2 className="text-2xl font-heading font-bold text-white">{t("waiting")}</h2>
        <p className="text-white/60 mt-2">{t("waitingDesc")}</p>
      </div>

      {/* Player count progress */}
      <div className="bg-white/10 border border-white/20 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-white/50 text-sm font-heading">Players Joined</span>
          <span className="text-white font-bold font-heading text-lg">
            {playerCount} / {maxPlayers}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(playerCount / maxPlayers) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Player slots */}
        <div className="flex justify-center gap-2 flex-wrap">
          {/* Host slot (always filled) */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-lg shadow-lg">
              👑
            </div>
            <span className="text-[10px] text-orange-400 font-heading">Host</span>
          </div>

          {/* Other joined players */}
          {opponents.map((op) => (
            <motion.div
              key={op.userId}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg shadow-lg">
                {op.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={op.avatarUrl}
                    alt={op.displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  "⚔️"
                )}
              </div>
              <span className="text-[10px] text-white/60 font-heading max-w-[40px] truncate">
                {op.displayName}
              </span>
            </motion.div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: spotsLeft }).map((_, i) => (
            <div key={`empty-${i}`} className="flex flex-col items-center gap-1">
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                className="w-10 h-10 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center"
              >
                <span className="text-white/30 text-xs">?</span>
              </motion.div>
              <span className="text-[10px] text-white/20 font-heading">Empty</span>
            </div>
          ))}
        </div>

        {spotsLeft > 0 && (
          <p className="text-white/40 text-xs font-heading">
            Waiting for {spotsLeft} more player{spotsLeft > 1 ? "s" : ""}…
          </p>
        )}
      </div>

      {/* Invite code display */}
      {inviteCode && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/10 border-2 border-white/30 rounded-2xl p-6"
        >
          <p className="text-white/50 text-sm font-heading mb-2">INVITE CODE</p>
          <p className="text-4xl font-bold font-heading text-yellow-400 tracking-widest">
            {inviteCode}
          </p>
          <motion.button
            onClick={copyCode}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-4 px-6 py-2 bg-white/20 text-white rounded-xl text-sm font-heading hover:bg-white/30 transition-colors"
          >
            📋 {t("copyCode")}
          </motion.button>
        </motion.div>
      )}

      {/* Prize info */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-4">
        <p className="text-yellow-400 font-heading font-bold text-sm">🏆 Prize Pool</p>
        <p className="text-white/60 text-xs mt-1">
          Kill reward: 1,000 XP per elimination · Winner bonus: {maxPlayers * 1000} XP
        </p>
        <p className="text-white/40 text-xs mt-1">
          Starting HP: {maxPlayers * 1000} HP per player
        </p>
      </div>

      {/* Loading dots */}
      <div className="flex justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            className="w-3 h-3 rounded-full bg-primary-400"
          />
        ))}
      </div>

      {/* Cancel */}
      <motion.button
        onClick={() => cancelMutation.mutate({ battleId })}
        disabled={cancelMutation.isPending}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="px-8 py-3 bg-white/10 text-white/70 rounded-xl font-heading hover:bg-white/20 transition-colors"
      >
        {t("cancelChallenge")}
      </motion.button>
    </div>
  );
}
