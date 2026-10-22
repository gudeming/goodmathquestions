"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { SceneHost } from "@/components/scenes/SceneHost";
import { CelebrationEffect } from "@/components/animations/CelebrationEffect";
import { DiscussionSection } from "@/components/questions/DiscussionSection";
import { MathText } from "@/components/ui/MathText";
import { HintLadder } from "./HintLadder";
import { hasScene } from "./scene";
import { usableHints } from "./hints";
import type { Track } from "./useTrack";
import { pick, type CheckResult, type Locale, type LooseBi, type PublicQuestion } from "./types";

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

const DIFFICULTY_KEY = { EASY: "easy", MEDIUM: "medium", HARD: "hard", CHALLENGE: "challenge" } as const;
const CELEBRATION_MS = 3000;
const RESULT_FLASH_MS = 2500;

interface DrillQuestionProps {
  question: PublicQuestion;
  locale: Locale;
  track: Track;
}

/**
 * Legacy practice layout for kind === "DRILL": optional scene card (only for a valid,
 * non-empty scene), the question, one answer box, hints, fun fact and discussion.
 */
export function DrillQuestion({ question, locale, track }: DrillQuestionProps) {
  const t = useTranslations("questions");
  const { data: session, status } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const reduced = useReducedMotion() ?? false;
  const inputId = useId();
  const showScene = useMemo(() => hasScene(question.animationConfig), [question.animationConfig]);
  const hints = useMemo(() => usableHints(question.hints), [question.hints]);

  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [explanation, setExplanation] = useState<LooseBi | null>(null);
  const [liked, setLiked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    if (result === "correct") return;
    const timer = setInterval(() => setTimeSpent((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [result]);

  useEffect(() => {
    if (!celebrate) return;
    const timer = setTimeout(() => setCelebrate(false), CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [celebrate]);

  useEffect(() => {
    if (result !== "incorrect") return;
    const timer = setTimeout(() => setResult(null), RESULT_FLASH_MS);
    return () => clearTimeout(timer);
  }, [result, attempts]);

  const onResult = (res: CheckResult & { xpEarned?: number; attempt?: number }) => {
    setError(null);
    const attempt = res.attempt ?? attempts + 1;
    setAttempts(attempt);
    track("answer_submit", { correct: res.isCorrect, attempt, hintsUsed: hintsRevealed, answerType: question.answerType });
    if (res.isCorrect) {
      setResult("correct");
      setXpEarned(res.xpEarned ?? 0);
      setExplanation(res.explanation);
      setCelebrate(!reduced);
    } else {
      setResult("incorrect");
    }
  };
  const onError = (e: { message: string }) => setError(t("submitFailed", { message: e.message }));
  const submit = trpc.question.submitAnswer.useMutation({ onSuccess: onResult, onError });
  const check = trpc.question.checkAnswer.useMutation({ onSuccess: onResult, onError });
  const toggleLike = trpc.question.toggleLike.useMutation({ onSuccess: (d) => setLiked(d.liked) });
  const pending = submit.isPending || check.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = answer.trim();
    if (!value || pending || status === "loading") return;
    setError(null);
    if (isLoggedIn) {
      submit.mutate({ questionId: question.id, answer: value, timeSpent, hintsUsed: hintsRevealed, guessed: false });
    } else {
      check.mutate({ questionId: question.id, answer: value });
    }
  };

  const minutes = Math.floor(timeSpent / 60);
  const seconds = String(timeSpent % 60).padStart(2, "0");
  const explanationText = pick(explanation, locale);
  const funFact = pick({ en: question.funFactEn, zh: question.funFactZh }, locale);

  return (
    <div className="mx-auto max-w-4xl" data-testid="drill-question">
      <AnimatePresence>{celebrate && <CelebrationEffect xp={xpEarned} />}</AnimatePresence>

      <header className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <span aria-hidden className="text-3xl">
            {CATEGORY_ICONS[question.category] || "🧮"}
          </span>
          <h1 className="font-heading text-3xl font-bold text-gray-800">{pick({ en: question.titleEn, zh: question.titleZh }, locale)}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="badge-level">{t(DIFFICULTY_KEY[question.difficulty])}</span>
          <span className="badge-xp" aria-label={t("timeSpent")}>
            ⏱️ {minutes}:{seconds}
          </span>
          {attempts > 0 && (
            <span className="rounded-full bg-primary-100 px-3 py-1 text-sm font-bold text-primary-700">
              {t("attempts")}: {attempts}
            </span>
          )}
          {result === "correct" && <span className="rounded-full bg-fun-green/20 px-3 py-1 text-sm font-bold text-green-700">{t("solved")} ✅</span>}
          <button
            type="button"
            onClick={() => isLoggedIn && toggleLike.mutate({ questionId: question.id })}
            disabled={!isLoggedIn}
            aria-pressed={liked}
            aria-label={t("likes")}
            className={`ml-auto flex min-h-[44px] items-center gap-1 rounded-full px-3 text-sm font-heading transition-colors ${
              liked ? "bg-fun-pink/20 text-fun-pink" : "bg-gray-100 text-gray-500 hover:bg-fun-pink/10"
            }`}
          >
            {liked ? "❤️" : "🤍"} {question._count.likes + (liked ? 1 : 0)}
          </button>
        </div>
      </header>

      <div className={showScene ? "grid gap-8 lg:grid-cols-2" : "mx-auto max-w-2xl"}>
        <div className="space-y-6">
          {showScene && (
            <div className="overflow-hidden rounded-card border-2 border-primary-100 bg-white p-6 shadow-lg" data-testid="scene-card">
              <SceneHost config={question.animationConfig} phase={result === "correct" ? "reveal" : "explore"} locale={locale} />
            </div>
          )}
          <div className="rounded-card border-2 border-fun-cyan/30 bg-white p-6 shadow-lg">
            <MathText as="p" className="font-body text-xl leading-relaxed text-gray-800" text={pick({ en: question.contentEn, zh: question.contentZh }, locale)} />
          </div>
        </div>

        <div className="mt-6 space-y-6 lg:mt-0">
          <form onSubmit={handleSubmit} className="rounded-card border-2 border-primary-100 bg-white p-6 shadow-lg">
            <label htmlFor={inputId} className="mb-4 block font-heading text-lg font-bold text-gray-800">
              {t("yourAnswer")}
            </label>
            <input
              id={inputId}
              type="text"
              autoComplete="off"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className={`input-fun text-center font-mono text-2xl ${
                result === "correct" ? "border-fun-green bg-green-50" : result === "incorrect" ? "border-fun-red bg-red-50" : ""
              }`}
              placeholder="?"
              disabled={result === "correct" || pending}
              data-testid="answer-input"
            />
            <div aria-live="polite">
              {result && (
                <motion.p
                  className={`mt-3 text-center font-heading font-bold ${result === "correct" ? "text-green-700" : "text-fun-orange"}`}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {result === "correct" ? t("correct") : t("incorrect")}
                  {result === "correct" && xpEarned > 0 && <span className="mt-1 block text-sm">{t("xpGained", { xp: xpEarned })} ✨</span>}
                </motion.p>
              )}
            </div>
            {error && (
              <p role="alert" className="mt-2 text-center font-heading text-sm text-fun-red">
                {error}
              </p>
            )}
            {!isLoggedIn && status !== "loading" && <p className="mt-2 text-center text-xs text-gray-500">{t("loginForXp")}</p>}
            {result !== "correct" && (
              <button
                type="submit"
                disabled={!answer.trim() || pending}
                className="btn-primary mt-4 min-h-[48px] w-full text-lg disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="check-answer"
              >
                {pending ? t("checking") : `${t("submitAnswer")} ✨`}
              </button>
            )}
          </form>

          {result === "correct" && explanationText && (
            <div className="rounded-card border-2 border-fun-green/30 bg-gradient-to-r from-fun-green/10 to-fun-cyan/10 p-6">
              <h3 className="mb-2 font-heading text-lg font-bold text-green-700">✅ {t("explanation")}</h3>
              <MathText as="p" className="font-body text-gray-700" text={explanationText} />
            </div>
          )}

          <HintLadder hints={hints} revealed={hintsRevealed} onReveal={() => setHintsRevealed((n) => Math.min(hints.length, n + 1))} locale={locale} />

          {funFact && (
            <div className="rounded-card border-2 border-fun-yellow/30 bg-gradient-to-r from-fun-yellow/20 to-fun-orange/20 p-6">
              <h3 className="mb-2 font-heading text-lg font-bold text-gray-800">💡 {t("funFact")}</h3>
              <MathText as="p" className="font-body text-gray-700" text={funFact} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-12">
        <DiscussionSection questionId={question.id} onPosted={(content) => track("comment_post", { length: [...content].length })} />
      </div>
    </div>
  );
}
