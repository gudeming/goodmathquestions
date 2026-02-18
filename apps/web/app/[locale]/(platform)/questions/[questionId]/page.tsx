"use client";

import { useTranslations, useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { MathAnimation } from "@/components/animations/MathAnimation";
import { CelebrationEffect } from "@/components/animations/CelebrationEffect";
import { HintRevealer } from "@/components/questions/HintRevealer";
import { DiscussionSection } from "@/components/questions/DiscussionSection";
import { type AnimationConfig } from "@gmq/animation-engine";
import { MathText } from "@/components/ui/MathText";

const CATEGORY_ICONS: Record<string, string> = {
  ARITHMETIC: "🔢",
  ALGEBRA: "🔤",
  GEOMETRY: "📐",
  FRACTIONS: "🍕",
  NUMBER_THEORY: "🔍",
  WORD_PROBLEMS: "📖",
  LOGIC: "🧩",
  PROBABILITY: "🎲",
  TRIGONOMETRY: "📏",
  CALCULUS: "∫",
  STATISTICS: "📊",
};

export default function QuestionPage() {
  const t = useTranslations("questions");
  const locale = useLocale();
  const isZh = locale === "zh";
  const params = useParams();
  const { data: session } = useSession();
  const rawQuestionId = params.questionId;
  const questionId = Array.isArray(rawQuestionId) ? rawQuestionId[0] : rawQuestionId;

  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationText, setExplanationText] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch question from API
  const { data: question, isLoading } = trpc.question.getById.useQuery(
    { id: questionId },
    { enabled: !!questionId }
  );

  const handleAnswerResult = useCallback(
    (payload: {
      isCorrect: boolean;
      xpEarned?: number;
      attempt?: number;
      explanation?: { en: string | null; zh: string | null } | null;
    }) => {
      if (payload.isCorrect) {
        setSubmitError(null);
        setResult("correct");
        setShowCelebration(true);
        setXpEarned(payload.xpEarned ?? 0);
        setShowExplanation(true);
        setExplanationText(
          isZh
            ? payload.explanation?.zh ?? null
            : payload.explanation?.en ?? null
        );
        setTimeout(() => setShowCelebration(false), 3000);
      } else {
        setResult("incorrect");
        setShowExplanation(false);
        setExplanationText(null);
        setTimeout(() => setResult(null), 2500);
      }

      if (typeof payload.attempt === "number") {
        setAttempts(payload.attempt);
      } else {
        setAttempts((prev) => prev + 1);
      }
    },
    [isZh]
  );

  // Submit answer mutation
  const submitAnswer = trpc.question.submitAnswer.useMutation({
    onSuccess: (data) => handleAnswerResult(data),
    onError: (error) => {
      setSubmitError(
        isZh
          ? `提交失败：${error.message}`
          : `Submit failed: ${error.message}`
      );
    },
  });

  // Guest answer check mutation (no XP / no DB submission)
  const checkAnswer = trpc.question.checkAnswer.useMutation({
    onSuccess: (data) => handleAnswerResult(data),
    onError: (error) => {
      setSubmitError(
        isZh
          ? `检查失败：${error.message}`
          : `Check failed: ${error.message}`
      );
    },
  });

  // Like toggle mutation
  const toggleLike = trpc.question.toggleLike.useMutation({
    onSuccess: (data) => setLiked(data.liked),
  });

  // Timer
  useEffect(() => {
    if (result === "correct") return; // Stop timer when solved
    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [result]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    if (!questionId) return;
    setSubmitError(null);

    if (session?.user) {
      // Authenticated: submit via API
      submitAnswer.mutate({
        questionId,
        answer: answer.trim(),
        timeSpent,
      });
    } else {
      // Guest mode: server-side check (no XP / no DB submission)
      checkAnswer.mutate({
        questionId,
        answer: answer.trim(),
      });
    }
  };

  const handleLike = () => {
    if (session?.user) {
      toggleLike.mutate({ questionId });
    }
  };

  // Loading state
  if (isLoading || !question) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <motion.div
          className="text-5xl mb-4 inline-block"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          🧮
        </motion.div>
        <p className="text-gray-500 font-heading">
          {isZh ? "加载题目中..." : "Loading question..."}
        </p>
      </div>
    );
  }

  const animConfig = question.animationConfig as AnimationConfig;
  const hints = (question.hints as Array<{ en: string; zh: string }>) || [];

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
            {CATEGORY_ICONS[question.category] || "🧮"}
          </span>
          <h1 className="text-3xl font-heading font-bold text-gray-800">
            {isZh ? question.titleZh : question.titleEn}
          </h1>
        </div>

        {/* Metadata bar */}
        <div className="flex flex-wrap gap-3 items-center">
          <span className="badge-level">{question.difficulty}</span>
          <span className="badge-xp">⏱️ {formatTime(timeSpent)}</span>
          {attempts > 0 && (
            <span className="bg-primary-100 text-primary-700 text-sm font-bold py-1 px-3 rounded-full">
              {t("attempts")}: {attempts}
            </span>
          )}
          {result === "correct" && (
            <motion.span
              className="bg-fun-green/20 text-fun-green text-sm font-bold py-1 px-3 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              {t("solved")} ✅
            </motion.span>
          )}

          {/* Like Button */}
          <button
            onClick={handleLike}
            className={`ml-auto flex items-center gap-1 px-3 py-1 rounded-full text-sm font-heading transition-all ${
              liked
                ? "bg-fun-pink/20 text-fun-pink"
                : "bg-gray-100 text-gray-500 hover:bg-fun-pink/10"
            }`}
          >
            {liked ? "❤️" : "🤍"} {question._count.likes + (liked ? 1 : 0)}
          </button>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Animation + Question */}
        <div>
          {/* Animation Display */}
          <motion.div
            className="bg-white rounded-card shadow-lg p-6 mb-6 border-2 border-primary-100 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <MathAnimation config={animConfig} revealSolution={result === "correct"} />
          </motion.div>

          {/* Question Text */}
          <motion.div
            className="bg-white rounded-card shadow-lg p-6 border-2 border-fun-cyan/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <MathText
              as="p"
              className="text-xl font-body text-gray-800 leading-relaxed"
              text={isZh ? question.contentZh : question.contentEn}
            />
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
                      ? "border-fun-red bg-red-50 animate-wiggle"
                      : ""
                  }`}
                  placeholder="?"
                  disabled={
                    result === "correct" ||
                    submitAnswer.isPending ||
                    checkAnswer.isPending
                  }
                  autoFocus
                />

                {/* Result feedback emoji */}
                <AnimatePresence>
                  {result && (
                    <motion.div
                      className="absolute -right-2 -top-2 text-2xl"
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
                      result === "correct" ? "text-fun-green" : "text-fun-orange"
                    }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {result === "correct" ? t("correct") : t("incorrect")}
                    {result === "correct" && xpEarned > 0 && (
                      <span className="block text-sm mt-1">
                        +{xpEarned} {t("xpEarned")} ✨
                      </span>
                    )}
                  </motion.p>
                )}
              </AnimatePresence>

              {submitError && (
                <p className="mt-2 text-sm text-fun-red text-center font-heading">
                  {submitError}
                </p>
              )}

              {/* Login prompt for guests */}
              {!session?.user && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  {isZh
                    ? "登录后提交答案可以获得经验值！"
                    : "Log in to earn XP when you submit answers!"}
                </p>
              )}

              {result !== "correct" && (
                <motion.button
                  type="submit"
                  disabled={
                    !answer.trim() ||
                    submitAnswer.isPending ||
                    checkAnswer.isPending
                  }
                  className="w-full btn-primary mt-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {submitAnswer.isPending || checkAnswer.isPending
                    ? isZh ? "检查中..." : "Checking..."
                    : `${t("submitAnswer")} ✨`}
                </motion.button>
              )}
            </form>
          </motion.div>

          {/* Explanation (shown after correct answer) */}
          <AnimatePresence>
            {showExplanation && explanationText && (
              <motion.div
                className="bg-gradient-to-r from-fun-green/10 to-fun-cyan/10 rounded-card p-6 border-2 border-fun-green/30"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0 }}
              >
                <h3 className="font-heading font-bold text-lg text-fun-green mb-2">
                  ✅ {isZh ? "解题思路" : "Solution Explanation"}
                </h3>
                <MathText as="p" className="text-gray-700 font-body" text={explanationText} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hints */}
          <HintRevealer hints={hints} isZh={isZh} />

          {/* Fun Fact */}
          {(question.funFactEn || question.funFactZh) && (
            <motion.div
              className="bg-gradient-to-r from-fun-yellow/20 to-fun-orange/20 rounded-card p-6 border-2 border-fun-yellow/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="font-heading font-bold text-lg text-gray-800 mb-2">
                💡 {t("funFact")}
              </h3>
              <MathText
                as="p"
                className="text-gray-700 font-body"
                text={(isZh ? question.funFactZh : question.funFactEn) || ""}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Discussion Section */}
      <div className="mt-12">
        <DiscussionSection questionId={questionId} />
      </div>
    </div>
  );
}
