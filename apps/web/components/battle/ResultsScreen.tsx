"use client";

import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useEffect } from "react";
import confetti from "canvas-confetti";

interface ResultsScreenProps {
  isWinner: boolean;
  xpChange: number;
  rounds: number;
  opponentName: string;
  myFinalHp: number;
  opponentFinalHp: number;
  onPlayAgain: () => void;
}

export function ResultsScreen({
  isWinner,
  xpChange,
  rounds,
  opponentName,
  myFinalHp,
  opponentFinalHp,
  onPlayAgain,
}: ResultsScreenProps) {
  const t = useTranslations("battle");
  const locale = useLocale();

  useEffect(() => {
    if (isWinner) {
      confetti({
        particleCount: 200,
        spread: 80,
        origin: { y: 0.5 },
        colors: ["#fbbf24", "#f97316", "#ef4444", "#22d3ee", "#a855f7"],
      });
    }
  }, [isWinner]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="bg-slate-800/80 border border-white/20 rounded-3xl p-8 max-w-md w-full text-center"
      >
        {/* Result header */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {isWinner ? (
            <>
              <div className="text-6xl mb-3">🏆</div>
              <h1 className="text-3xl font-heading font-bold text-yellow-400">{t("won")}</h1>
              <p className="text-white/60 mt-1">You defeated {opponentName}!</p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-3">💪</div>
              <h1 className="text-3xl font-heading font-bold text-fun-pink">{t("lost")}</h1>
              <p className="text-white/60 mt-1">{opponentName} won this time!</p>
            </>
          )}
        </motion.div>

        {/* XP Change */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: "spring" }}
          className={`mt-6 py-4 px-6 rounded-2xl ${isWinner ? "bg-yellow-500/20 border border-yellow-500/40" : "bg-red-500/20 border border-red-500/40"}`}
        >
          <p className="text-white/60 text-sm">{isWinner ? t("xpGained") : t("xpLost")}</p>
          <p className={`text-4xl font-bold font-heading ${isWinner ? "text-yellow-400" : "text-red-400"}`}>
            {isWinner ? "+" : ""}{xpChange.toLocaleString()} XP
          </p>
        </motion.div>

        {/* Battle stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-5 grid grid-cols-3 gap-3 text-center"
        >
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-white/50 text-xs">Rounds</p>
            <p className="text-white font-bold text-xl">{rounds}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-white/50 text-xs">Your HP</p>
            <p className={`font-bold text-xl ${myFinalHp > 0 ? "text-green-400" : "text-red-400"}`}>
              {myFinalHp.toLocaleString()}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-white/50 text-xs">Opp HP</p>
            <p className={`font-bold text-xl ${opponentFinalHp > 0 ? "text-green-400" : "text-red-400"}`}>
              {opponentFinalHp.toLocaleString()}
            </p>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6 flex flex-col gap-3"
        >
          <motion.button
            onClick={onPlayAgain}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-4 bg-gradient-to-r from-primary-500 to-fun-purple text-white font-bold rounded-2xl font-heading text-lg"
          >
            {t("playAgain")}
          </motion.button>
          <Link
            href={`/${locale !== "en" ? locale + "/" : ""}ohmygame`}
            className="w-full py-3 bg-white/10 text-white/70 rounded-2xl font-heading text-sm text-center hover:bg-white/20 transition-colors block"
          >
            {t("backToLobby")}
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
