"use client";

import { useTranslations } from "next-intl";
import type { OptionItem } from "@/components/question-v2/types";
import type { GuessSplit } from "./shared";

const COLORS = ["bg-fun-cyan", "bg-fun-pink", "bg-fun-yellow", "bg-fun-green", "bg-fun-purple", "bg-fun-orange"];

/** Whole percentages that add up to 100 (largest remainder). */
export function splitPercents(counts: number[]): number[] {
  const total = counts.reduce((s, c) => s + c, 0);
  if (total === 0) return counts.map(() => 0);
  const raw = counts.map((c) => (c / total) * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => [v - floors[i], i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    floors[i]++;
    left--;
  }
  return floors;
}

interface GuessSplitBarProps {
  split: NonNullable<GuessSplit>;
  options: OptionItem[];
  /** The viewer's own guess (option id), highlighted. */
  mine?: string | null;
}

/** "Who thinks what": one stacked bar of Act 1 guesses, with a readable legend. */
export function GuessSplitBar({ split, options, mine }: GuessSplitBarProps) {
  const t = useTranslations("discussion");
  const rows = split.options
    .map((o, i) => ({ ...o, label: options.find((x) => x.id === o.id)?.label ?? o.id, color: COLORS[i % COLORS.length] }))
    .filter((o) => o.label !== "");
  const percents = splitPercents(rows.map((r) => r.count));

  return (
    <div className="mb-6 rounded-card bg-primary-50/60 p-4" data-testid="guess-split">
      <p className="mb-2 font-heading text-sm font-bold text-gray-700">
        🗳️ {t("whoThinksWhat")} <span className="font-body font-normal text-gray-500">· {t("splitVotes", { count: split.total })}</span>
      </p>
      <div aria-hidden className="flex h-4 w-full overflow-hidden rounded-full bg-white">
        {rows.map((r, i) =>
          percents[i] > 0 ? <div key={r.id} className={`${r.color} h-full`} style={{ width: `${percents[i]}%` }} /> : null
        )}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-body text-sm text-gray-700">
        {rows.map((r, i) => (
          <li key={r.id} className={`flex items-center gap-1.5 ${r.id === mine ? "font-bold" : ""}`}>
            <span aria-hidden className={`inline-block h-3 w-3 rounded-full ${r.color}`} />
            {r.label} {percents[i]}%{r.id === mine && <span className="text-primary-600"> ({t("you")})</span>}
          </li>
        ))}
      </ul>
      {mine && <p className="mt-2 font-body text-sm text-gray-600">{t("splitArgue")}</p>}
    </div>
  );
}
