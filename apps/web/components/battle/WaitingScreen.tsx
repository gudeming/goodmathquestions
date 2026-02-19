"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";

interface WaitingScreenProps {
  battleId: string;
  inviteCode: string | null;
  onCancelled: () => void;
  onMatchFound: (battleId: string) => void;
}

export function WaitingScreen({ battleId, inviteCode, onCancelled, onMatchFound }: WaitingScreenProps) {
  const t = useTranslations("battle");

  // Poll for opponent joining
  const { data: state } = trpc.battle.getState.useQuery(
    { battleId },
    {
      refetchInterval: 1500,
      staleTime: 0,
      enabled: true,
    }
  );

  const cancelMutation = trpc.battle.cancelWaiting.useMutation({
    onSuccess: onCancelled,
  });

  // Redirect when opponent joins
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

  return (
    <div className="max-w-md mx-auto py-16 px-4 text-center space-y-8">
      {/* Animated waiting icon */}
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
