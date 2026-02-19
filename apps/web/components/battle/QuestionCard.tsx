"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { MathText } from "@/components/ui/MathText";

interface QuestionCardProps {
  promptEn: string;
  promptZh: string;
  difficulty: string;
  category: string;
  roundNumber: number;
  roundTimeRemaining: number;
  hasAnswered: boolean;
  onSubmit: (answer: string, timeMs: number) => void;
  isSubmitting?: boolean;
  lastResult?: { isCorrect: boolean; battleXpGained: number; correctAnswer: string | null } | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "bg-green-500",
  MEDIUM: "bg-yellow-500",
  HARD: "bg-orange-500",
  CHALLENGE: "bg-red-500",
};

export function QuestionCard({
  promptEn,
  promptZh,
  difficulty,
  category,
  roundNumber,
  roundTimeRemaining,
  hasAnswered,
  onSubmit,
  isSubmitting,
  lastResult,
}: QuestionCardProps) {
  const t = useTranslations("battle");
  const [answer, setAnswer] = useState("");
  const [startTime] = useState(Date.now());
  const isUrgent = roundTimeRemaining <= 10;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || hasAnswered || isSubmitting) return;
    const responseTimeMs = Math.min(Date.now() - startTime, 30000);
    onSubmit(answer.trim(), responseTimeMs);
    setAnswer("");
  }

  return (
    <motion.div
      key={roundNumber}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20"
    >
      {/* Header: category + difficulty + timer */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-xs uppercase tracking-wide">{category}</span>
          <span className={`text-white text-xs px-2 py-0.5 rounded-full font-bold ${DIFFICULTY_COLORS[difficulty] ?? "bg-gray-500"}`}>
            {difficulty}
          </span>
        </div>

        {/* Countdown timer */}
        <div className={`flex items-center gap-1 font-bold text-lg ${isUrgent ? "text-red-400 animate-pulse" : "text-white"}`}>
          ⏱ {roundTimeRemaining}s
        </div>
      </div>

      {/* Question text */}
      <div className="mb-5">
        <MathText as="p" className="text-white text-lg font-medium leading-relaxed" text={promptEn} />
        <MathText as="p" className="text-white/60 text-sm mt-1" text={promptZh} />
      </div>

      {/* Answer form */}
      <AnimatePresence mode="wait">
        {!hasAnswered ? (
          <motion.form
            key="form"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="flex gap-2"
          >
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer..."
              className="flex-1 bg-white/20 text-white placeholder-white/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400 font-heading text-lg"
              autoFocus
              disabled={isSubmitting}
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={!answer.trim() || isSubmitting}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-5 py-3 rounded-xl disabled:opacity-50 font-heading"
            >
              {t("submit")}
            </motion.button>
          </motion.form>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {lastResult ? (
              <div className={`rounded-xl p-4 font-heading font-bold text-center ${lastResult.isCorrect ? "bg-green-500/30 text-green-300" : "bg-red-500/30 text-red-300"}`}>
                <p className="text-lg">{lastResult.isCorrect ? t("correct") : t("wrong")}</p>
                {!lastResult.isCorrect && lastResult.correctAnswer && (
                  <p className="text-sm mt-1 opacity-80">{t("correctAnswer")} {lastResult.correctAnswer}</p>
                )}
                {lastResult.battleXpGained > 0 && (
                  <p className="text-yellow-300 mt-1">+{lastResult.battleXpGained} ⚡ Battle Power!</p>
                )}
              </div>
            ) : (
              <p className="text-white/60 text-center font-heading">{t("waitingForOpponent")}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
