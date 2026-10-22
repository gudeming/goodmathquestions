"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { SceneHost } from "@/components/scenes/SceneHost";
import { hasScene } from "@/components/question-v2/scene";
import { localePath, pickText, questionPath, type Locale, type TodayPuzzle } from "@/components/worlds/types";

// React 18's types don't know `inert` yet; the DOM attribute works in all evergreen browsers.
const INERT = { inert: "" } as Record<string, string>;

interface TodayPuzzleCardProps {
  /** undefined = loading, null = no puzzle today. */
  puzzle: TodayPuzzle | null | undefined;
  locale: Locale;
  /** Heading level: h2 on the landing (below the hero), h1 on home. */
  headingLevel?: "h1" | "h2";
}

/**
 * The daily puzzle: hook sentence, the scene's hook-phase poster, how many kids
 * have guessed, and one button into the question. Shared by landing and home.
 */
export function TodayPuzzleCard({ puzzle, locale, headingLevel = "h2" }: TodayPuzzleCardProps) {
  const t = useTranslations("home");
  const tw = useTranslations("worlds");
  const Heading = headingLevel;
  const showScene = useMemo(() => (puzzle ? hasScene(puzzle.animationConfig) : false), [puzzle]);

  if (puzzle === undefined) {
    return <div className="h-72 animate-pulse rounded-card bg-white/70 shadow-lg" role="status" aria-label={t("todayTitle")} />;
  }

  if (puzzle === null) {
    return (
      <section className="rounded-card border-2 border-primary-100 bg-white/90 p-8 text-center shadow-lg">
        <Heading className="mb-2 font-heading text-2xl font-bold text-gray-800">📅 {t("todayTitle")}</Heading>
        <p className="mb-4 font-body text-gray-600">{t("todayEmpty")}</p>
        <Link href={localePath(locale, "/worlds")} className="btn-secondary inline-block min-h-[44px]">
          {tw("title")} →
        </Link>
      </section>
    );
  }

  const hook = pickText(puzzle.hookEn, puzzle.hookZh, locale) || pickText(puzzle.titleEn, puzzle.titleZh, locale);
  const href = questionPath(locale, puzzle);

  return (
    <section
      aria-labelledby="today-puzzle-title"
      className="overflow-hidden rounded-card border-2 border-fun-yellow/50 bg-gradient-to-br from-white via-white to-fun-yellow/10 shadow-xl"
      data-testid="today-puzzle"
    >
      <div className={`grid gap-6 p-6 sm:p-8 ${showScene ? "md:grid-cols-[3fr_2fr] md:items-center" : ""}`}>
        <div className="text-left">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Heading id="today-puzzle-title" className="rounded-full bg-fun-yellow px-4 py-1 font-heading text-sm font-bold uppercase tracking-wide text-gray-900">
              📅 {t("todayTitle")}
            </Heading>
            <span className="font-heading text-sm text-gray-500">{t("todayFresh")}</span>
          </div>
          <p className="font-heading text-xl leading-relaxed text-gray-800 sm:text-2xl" data-testid="today-hook">
            {hook}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <Link href={href} className="btn-primary inline-block min-h-[48px] text-center text-lg" data-testid="today-play">
              {t("todayPlay")} →
            </Link>
            <span className="font-heading text-sm text-gray-600" data-testid="today-guess-count">
              👀 {t("todayGuessed", { count: puzzle.guessCount })}
            </span>
          </div>
        </div>
        {showScene && (
          // A still poster: playing happens on the question page, so the scene is inert here
          // (no focus, no clicks, hidden from screen readers; the hook text carries the meaning).
          <div {...INERT} aria-hidden className="pointer-events-none select-none overflow-hidden rounded-card border-2 border-primary-100 bg-white p-2" data-testid="today-poster">
            <SceneHost config={puzzle.animationConfig} phase="hook" locale={locale} />
          </div>
        )}
      </div>
    </section>
  );
}
