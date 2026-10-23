"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { ageLabel, pickText, questionPath, worldColors, type Locale, type WorldInfo, type WorldQuestionCard } from "./types";

interface WorldPathProps {
  world: WorldInfo;
  /** Published hero questions in sortOrder, rendered on the server. */
  questions: WorldQuestionCard[];
}

/**
 * A world's puzzles as a path. Nothing is locked: the first unsolved puzzle is
 * highlighted as "Up next" instead (locking makes kids leave).
 */
export function WorldPath({ world, questions }: WorldPathProps) {
  const t = useTranslations("worlds");
  const locale: Locale = useLocale() === "zh" ? "zh" : "en";
  const { status } = useSession();
  const solvedQuery = trpc.user.solvedHeroIds.useQuery(undefined, { enabled: status === "authenticated", retry: 1 });
  const solved = useMemo(() => new Set(solvedQuery.data?.ids ?? []), [solvedQuery.data]);
  const colors = worldColors(world.colorToken);

  // Hooks are plain sentences by content rule, so no KaTeX here (keeps the page light).
  // While a signed-in user's progress loads, don't guess which one is next.
  const progressKnown = status === "unauthenticated" || solvedQuery.isSuccess;
  const upNextId = progressKnown ? questions.find((q) => !solved.has(q.id))?.id ?? null : null;

  if (questions.length === 0) {
    return <p className="rounded-card bg-white/70 p-8 text-center font-heading text-gray-500">{t("empty")}</p>;
  }

  return (
    <ol aria-label={t("pathLabel")} className="relative space-y-5 before:absolute before:bottom-6 before:left-6 before:top-6 before:w-1 before:rounded-full before:bg-gray-200 sm:before:left-7">
      {questions.map((q, i) => {
        const isSolved = solved.has(q.id);
        const isNext = q.id === upNextId;
        const hook = pickText(q.hookEn, q.hookZh, locale) || pickText(q.titleEn, q.titleZh, locale);
        const age = ageLabel(q.ageGroup);
        return (
          <li key={q.id} className="relative flex items-start gap-4" data-testid="world-path-item">
            <span
              aria-hidden
              className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-white font-heading text-lg font-bold shadow-md sm:h-14 sm:w-14 ${
                isSolved ? "bg-fun-green text-white" : isNext ? "bg-primary-500 text-white" : "bg-white text-gray-500"
              }`}
            >
              {isSolved ? "✓" : i + 1}
            </span>
            <Link
              href={questionPath(locale, q)}
              className={`group block flex-1 rounded-card border-2 bg-white p-5 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300 ${
                isNext ? `${colors.border} ring-4 ring-primary-200` : "border-transparent"
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {isNext && (
                  <span className="rounded-full bg-primary-500 px-3 py-0.5 font-heading text-xs font-bold text-white" data-testid="up-next">
                    {t("upNext")}
                  </span>
                )}
                {isSolved && (
                  <span className="rounded-full bg-fun-green/15 px-3 py-0.5 font-heading text-xs font-bold text-green-700">
                    ✓ {t("solvedBadge")}
                  </span>
                )}
                {age && (
                  <span className="rounded-full bg-primary-50 px-2 py-0.5 font-heading text-xs text-primary-700">{t("ages", { range: age })}</span>
                )}
                {q.variantCount > 0 && (
                  <span
                    className="rounded-full bg-fun-purple/10 px-2 py-0.5 font-heading text-xs text-purple-700"
                    title={t("variantsHint", { count: q.variantCount })}
                    data-testid="variant-badge"
                  >
                    🔁 {t("variants", { count: q.variantCount })}
                  </span>
                )}
              </div>
              <p className="font-body text-base leading-relaxed text-gray-800 line-clamp-3 sm:text-lg">{hook}</p>
              <span className="mt-3 inline-block font-heading text-sm font-semibold text-primary-600 group-hover:text-primary-800">
                {t("play")} →
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
