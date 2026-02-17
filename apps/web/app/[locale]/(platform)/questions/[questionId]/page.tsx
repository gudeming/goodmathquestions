"use client";

import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { MathAnimation } from "@/components/animations/MathAnimation";
import { CelebrationEffect } from "@/components/animations/CelebrationEffect";
import { HintRevealer } from "@/components/questions/HintRevealer";
import { DiscussionSection } from "@/components/questions/DiscussionSection";

// Mock question data (will be replaced with tRPC query)
const MOCK_QUESTION = {
  id: "1",
  titleEn: "The Pizza Problem",
  titleZh: "披萨问题",
  contentEn:
    "If you cut a pizza into 8 equal slices and eat 3, what fraction of the pizza is left?",
  contentZh: "如果你把一个披萨切成8等份，吃了3片，剩下多少？",
  difficulty: "EASY",
  category: "FRACTIONS",
  ageGroup: "AGE_8_10",
  answer: "5/8",
  hints: [
    { en: "Think about how many slices you started with", zh: "想想你一开始有多少片" },
    { en: "You had 8 slices and ate 3...", zh: "你有8片，吃了3片..." },
    { en: "8 - 3 = 5 slices left out of 8 total", zh: "8 - 3 = 5片，总共8片" },
  ],
  animationConfig: {
    type: "pizza_slice",
    totalSlices: 8,
    eatenSlices: 3,
    colors: ["#ff6b9d", "#fbbf24", "#4ade80", "#60a5fa"],
  },
  funFactEn: "Did you know? The word 'fraction' comes from the Latin word 'fractio' which means 'to break'!",
  funFactZh: "你知道吗？分数这个概念最早出现在古埃及，他们用分数来分配尼罗河的土地！",
};

export default function QuestionPage() {
  const t = useTranslations("questions");
  const params = useParams();
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const question = MOCK_QUESTION; // Will be tRPC query
  const isZh =
    typeof window !== "undefined" &&
    window.location.pathname.includes("/zh");

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttempts((prev) => prev + 1);

    const isCorrect =
      answer.trim().toLowerCase() === question.answer.trim().toLowerCase();

    if (isCorrect) {
      setResult("correct");
      setShowCelebration(true);
      setXpEarned(10); // Based on difficulty
      setTimeout(() => setShowCelebration(false), 3000);
    } else {
      setResult("incorrect");
      setTimeout(() => setResult(null), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && <CelebrationEffect xp={xpEarned} />}
      </AnimatePresence>

      {/* Question Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">
            {question.category === "FRACTIONS" ? "🍕" : "🧮"}
          </span>
          <h1 className="text-3xl font-heading font-bold text-gray-800">
            {isZh ? question.titleZh : question.titleEn}
          </h1>
        </div>

        {/* Metadata bar */}
        <div className="flex flex-wrap gap-3">
          <span className="badge-level">{question.difficulty}</span>
          <span className="badge-xp">⏱️ {formatTime(timeSpent)}</span>
          {attempts > 0 && (
            <span className="bg-primary-100 text-primary-700 text-sm font-bold py-1 px-3 rounded-full">
              {t("attempts")}: {attempts}
            </span>
          )}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Animation + Question */}
        <div>
          {/* Animation Display */}
          <motion.div
            className="bg-white rounded-card shadow-lg p-6 mb-6 border-2 border-primary-100"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <MathAnimation config={question.animationConfig} />
          </motion.div>

          {/* Question Text */}
          <motion.div
            className="bg-white rounded-card shadow-lg p-6 border-2 border-fun-cyan/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-xl font-body text-gray-800 leading-relaxed">
              {isZh ? question.contentZh : question.contentEn}
            </p>
          </motion.div>
        </div>

        {/* Right: Answer + Hints + Fun Fact */}
        <div className="space-y-6">
          {/* Answer Input */}
          <motion.div
            className="bg-white rounded-card shadow-lg p-6 border-2 border-primary-100"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="font-heading font-bold text-lg text-gray-800 mb-4">
              {t("yourAnswer")}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="relative">
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className={`input-fun text-center text-2xl font-mono ${
                    result === "correct"
                      ? "border-fun-green bg-green-50"
                      : result === "incorrect"
                      ? "border-fun-red bg-red-50"
                      : ""
                  }`}
                  placeholder="?"
                  disabled={result === "correct"}
                />

                {/* Result feedback */}
                <AnimatePresence>
                  {result && (
                    <motion.div
                      className={`absolute -right-2 -top-2 text-2xl`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                      exit={{ scale: 0 }}
                    >
                      {result === "correct" ? "🎉" : "🤔"}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Result message */}
              <AnimatePresence>
                {result && (
                  <motion.p
                    className={`mt-3 font-heading font-bold text-center ${
                      result === "correct"
                        ? "text-fun-green"
                        : "text-fun-orange"
                    }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {result === "correct" ? t("correct") : t("incorrect")}
                    {result === "correct" && (
                      <span className="block text-sm mt-1">
                        +{xpEarned} {t("xpEarned")} ✨
                      </span>
                    )}
                  </motion.p>
                )}
              </AnimatePresence>

              {result !== "correct" && (
                <motion.button
                  type="submit"
                  className="w-full btn-primary mt-4 text-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t("submitAnswer")} ✨
                </motion.button>
              )}
            </form>
          </motion.div>

          {/* Hints */}
          <HintRevealer hints={question.hints} isZh={isZh} />

          {/* Fun Fact */}
          <motion.div
            className="bg-gradient-to-r from-fun-yellow/20 to-fun-orange/20 rounded-card p-6 border-2 border-fun-yellow/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <h3 className="font-heading font-bold text-lg text-gray-800 mb-2">
              💡 {t("funFact")}
            </h3>
            <p className="text-gray-700 font-body">
              {isZh ? question.funFactZh : question.funFactEn}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Discussion Section */}
      <div className="mt-12">
        <DiscussionSection questionId={question.id} />
      </div>
    </div>
  );
}
