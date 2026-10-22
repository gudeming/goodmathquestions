"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { getLocalizedPath } from "@/lib/seo";
import { SceneHost } from "@/components/scenes/SceneHost";
import { CelebrationEffect } from "@/components/animations/CelebrationEffect";
import { DiscussionSection } from "@/components/questions/DiscussionSection";
import { guessOptionsFor } from "@/components/discussion/shared";
import { MathText } from "@/components/ui/MathText";
import { GuessHistogram } from "./GuessHistogram";
import { answerOptions } from "./AnswerInput";
import { hasScene } from "./scene";
import type { SolvedResult } from "./ExploreStage";
import type { Track } from "./useTrack";
import { pick, type Locale, type PublicQuestion } from "./types";

interface RevealStageProps {
  question: PublicQuestion;
  locale: Locale;
  gaveUp: boolean;
  guess: string | null;
  /** Set when the child solved it in this page view (celebrate + show XP). */
  solved: SolvedResult | null;
  isLoggedIn: boolean;
  track: Track;
}

const CELEBRATION_MS = 3000;

/** Act 3: the scene's reveal, the aha, how it works, one step further, and the discussion. */
export function RevealStage({ question, locale, gaveUp, guess, solved, isLoggedIn, track }: RevealStageProps) {
  const t = useTranslations("questions");
  const reduced = useReducedMotion();
  const extensionId = useId();
  const showScene = useMemo(() => hasScene(question.animationConfig), [question.animationConfig]);
  const reveal = trpc.question.reveal.useQuery({ questionId: question.id }, { retry: 1, staleTime: Infinity });
  const histogram = trpc.guess.histogram.useQuery(
    { questionId: question.id },
    { enabled: guess !== null && question.guessConfig !== null, retry: 1 }
  );
  const [celebrate, setCelebrate] = useState(solved !== null && !reduced);
  const [extensionOpen, setExtensionOpen] = useState(false);
  const seen = useRef(false);
  const extensionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (seen.current) return;
    seen.current = true;
    track("reveal_seen", { gaveUp });
  }, [gaveUp, track]);

  useEffect(() => {
    if (!celebrate) return;
    const timer = setTimeout(() => setCelebrate(false), CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [celebrate]);

  const aha = pick(solved?.aha ?? reveal.data?.aha ?? null, locale);
  const explanation = pick(solved?.explanation ?? reveal.data?.explanation ?? null, locale);
  const extension = pick({ en: question.extensionEn, zh: question.extensionZh }, locale);
  const funFact = pick({ en: question.funFactEn, zh: question.funFactZh }, locale);
  const discussion = pick({ en: question.discussionPromptEn, zh: question.discussionPromptZh }, locale);

  const answerText = (() => {
    const raw = reveal.data?.answer;
    if (!raw) return null;
    if (question.answerType === "CHOICE") return answerOptions(question, locale).find((o) => o.id === raw)?.label ?? raw;
    return raw;
  })();

  return (
    <div className="space-y-6">
      <AnimatePresence>{celebrate && <CelebrationEffect xp={solved?.xpEarned ?? 0} />}</AnimatePresence>

      {showScene && (
        <div className="overflow-hidden rounded-card border-2 border-primary-100 bg-white p-3 shadow-lg sm:p-4" data-testid="scene-card">
          <SceneHost config={question.animationConfig} phase="reveal" locale={locale} />
        </div>
      )}

      <section className="rounded-card border-2 border-fun-green/40 bg-gradient-to-r from-fun-green/10 to-fun-cyan/10 p-6 sm:p-8" data-testid="aha-card">
        <p className="mb-1 font-heading text-lg font-bold text-green-700">
          {gaveUp ? `🔑 ${t("gaveUpTitle")}` : `🎉 ${t("youGotIt")}`}
          {solved && solved.xpEarned > 0 && <span className="badge-xp ml-3 align-middle">{t("xpGained", { xp: solved.xpEarned })}</span>}
        </p>
        {gaveUp && answerText && <MathText as="p" className="mb-3 font-heading text-2xl font-bold text-gray-800" text={t("answerWas", { answer: answerText })} />}
        <h2 className="mt-3 font-heading text-2xl font-bold text-gray-800">💡 {t("aha")}</h2>
        {aha ? (
          <MathText as="p" className="mt-2 font-body text-xl leading-relaxed text-gray-800" text={aha} />
        ) : reveal.isLoading ? (
          <div aria-hidden className="mt-3 h-6 w-3/4 animate-pulse rounded bg-white/70" />
        ) : reveal.isError ? (
          <p className="mt-2 text-sm text-gray-600">{t("revealFailed")}</p>
        ) : null}
        {!isLoggedIn && (
          <p className="mt-4 text-sm text-gray-600">
            {t("loginForXp")}{" "}
            <Link href={getLocalizedPath(locale, "/login")} className="font-heading font-semibold text-primary-600 underline">
              {t("logIn")}
            </Link>
          </p>
        )}
      </section>

      {guess !== null && question.guessConfig && histogram.data && (
        <GuessHistogram
          histogram={histogram.data}
          guessConfig={question.guessConfig}
          mine={guess}
          truth={reveal.data?.guessTruth ?? null}
          locale={locale}
        />
      )}

      {explanation && (
        <details className="group rounded-card border-2 border-primary-100 bg-white p-5 shadow" open={gaveUp}>
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between font-heading text-lg font-bold text-gray-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-fun-cyan/50">
            ✅ {t("explanation")}
            <span aria-hidden className="text-gray-400 transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <MathText as="p" className="mt-3 font-body text-gray-700" text={explanation} />
        </details>
      )}

      {funFact && (
        <div className="rounded-card border-2 border-fun-yellow/30 bg-gradient-to-r from-fun-yellow/20 to-fun-orange/20 p-5">
          <h3 className="mb-1 font-heading text-lg font-bold text-gray-800">✨ {t("funFact")}</h3>
          <MathText as="p" className="font-body text-gray-700" text={funFact} />
        </div>
      )}

      {extension && (
        <section className="rounded-card border-2 border-fun-purple/30 bg-white p-5 shadow">
          <h3 className="font-heading text-lg font-bold text-gray-800">🚀 {t("goDeeper")}</h3>
          {!extensionOpen && (
            <button
              type="button"
              aria-expanded={false}
              aria-controls={extensionId}
              onClick={() => {
                setExtensionOpen(true);
                track("extension_open");
                // The button goes away; keep keyboard focus on what it opened.
                requestAnimationFrame(() => extensionRef.current?.focus());
              }}
              className="btn-secondary mt-3 min-h-[44px]"
              data-testid="open-extension"
            >
              {t("openExtension")}
            </button>
          )}
          <div id={extensionId} ref={extensionRef} hidden={!extensionOpen} tabIndex={-1} className="focus:outline-none">
            <MathText as="p" className="mt-2 font-body text-lg text-gray-700" text={extension} />
          </div>
        </section>
      )}

      <DiscussionSection
        questionId={question.id}
        prompt={discussion || null}
        onPosted={(content) => track("comment_post", { length: [...content].length })}
        guessValue={guess}
        solutionTags={question.solutionTags}
        guessOptions={guessOptionsFor(question.guessConfig, locale)}
      />
    </div>
  );
}
