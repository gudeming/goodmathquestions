"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ProgressRing } from "./ProgressRing";
import { localePath, pickText, worldColors, type Locale, type WorldInfo } from "./types";

interface WorldCardProps {
  world: WorldInfo;
  locale: Locale;
  /** Solved count for the signed-in user; null hides the ring (guests, or still loading). */
  solved: number | null;
}

/** One world entry: emoji, title, one-line description, and progress. Worlds with no puzzles are disabled. */
export function WorldCard({ world, locale, solved }: WorldCardProps) {
  const t = useTranslations("worlds");
  const colors = worldColors(world.colorToken);
  const title = pickText(world.titleEn, world.titleZh, locale);
  const desc = pickText(world.descEn, world.descZh, locale);
  const live = world.questionCount > 0;

  const body = (
    <div className="flex h-full items-start gap-4">
      <span aria-hidden className="text-4xl leading-none sm:text-5xl">
        {world.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className={`font-heading text-lg font-bold ${live ? "text-gray-800 group-hover:text-primary-700" : "text-gray-500"}`}>{title}</h3>
        <p className="mt-1 font-body text-sm text-gray-600 line-clamp-2">{desc}</p>
        <p className="mt-2 font-heading text-xs font-medium text-gray-500">
          {live ? t("questionCount", { count: world.questionCount }) : t("comingSoon")}
        </p>
      </div>
      {live && solved !== null && (
        <ProgressRing
          solved={solved}
          total={world.questionCount}
          colorClass={colors.ring}
          label={t("progressLabel", { solved, total: world.questionCount })}
        />
      )}
    </div>
  );

  const frame = `block h-full rounded-card border-2 bg-gradient-to-br p-5 ${colors.soft} ${colors.border}`;

  if (!live) {
    return (
      <div className={`${frame} cursor-not-allowed opacity-60`} aria-disabled="true" data-testid={`world-card-${world.slug}`}>
        {body}
      </div>
    );
  }

  return (
    <Link
      href={localePath(locale, `/worlds/${world.slug}`)}
      className={`${frame} group shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300`}
      data-testid={`world-card-${world.slug}`}
    >
      {body}
    </Link>
  );
}
