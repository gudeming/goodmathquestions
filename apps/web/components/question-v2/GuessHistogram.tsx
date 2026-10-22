"use client";

import { useTranslations } from "next-intl";
import { formatNumber, pick, type GuessConfig, type Histogram, type Locale } from "./types";

interface GuessHistogramProps {
  histogram: Histogram;
  guessConfig: GuessConfig;
  /** The viewer's guess (falls back to histogram.mine). */
  mine: string | null;
  /** Only passed after the reveal: the value that is actually right. */
  truth?: string | null;
  locale: Locale;
}

interface Bar {
  key: string;
  label: string;
  count: number;
  isMine: boolean;
  isTruth: boolean;
}

function bucketOf(value: string | null, buckets: Array<{ from: number; to: number }>): number {
  if (value === null) return -1;
  const n = Number(value);
  if (!Number.isFinite(n)) return -1;
  const i = buckets.findIndex((b, idx) => n >= b.from && (n < b.to || idx === buckets.length - 1));
  return i;
}

/** "What everyone else guessed": 10 buckets for sliders, one bar per option otherwise. */
export function GuessHistogram({ histogram, guessConfig, mine, truth, locale }: GuessHistogramProps) {
  const t = useTranslations("questions");
  const own = mine ?? histogram.mine;
  const total = histogram.total;

  let bars: Bar[];
  if (histogram.type === "slider") {
    const mineIdx = bucketOf(own, histogram.buckets);
    const truthIdx = truth != null ? bucketOf(truth, histogram.buckets) : -1;
    const unit = guessConfig.type === "slider" ? pick(guessConfig.unit ?? null, locale) : "";
    bars = histogram.buckets.map((b, i) => ({
      key: String(i),
      label: `${formatNumber(b.from, locale)}–${formatNumber(b.to, locale)}${unit ? ` ${unit}` : ""}`,
      count: b.count,
      isMine: i === mineIdx,
      isTruth: i === truthIdx,
    }));
  } else {
    const labelFor = (id: string): string => {
      if (guessConfig.type === "choice") return pick(guessConfig.options.find((o) => o.id === id) ?? null, locale) || id;
      if (guessConfig.type === "compare") {
        if (id === "left") return pick(guessConfig.left, locale);
        if (id === "right") return pick(guessConfig.right, locale);
        return t("compareSame");
      }
      return id;
    };
    bars = histogram.options.map((o) => ({
      key: o.id,
      label: labelFor(o.id),
      count: o.count,
      isMine: o.id === own,
      isTruth: truth != null && o.id === truth,
    }));
  }

  const maxCount = Math.max(1, ...bars.map((b) => b.count));
  const pct = (c: number) => (total > 0 ? Math.round((c / total) * 100) : 0);
  const others = Math.max(0, total - (own !== null ? 1 : 0));

  return (
    <figure className="rounded-card border-2 border-fun-cyan/30 bg-white p-4 sm:p-6" data-testid="guess-histogram">
      <figcaption className="mb-4 font-heading font-semibold text-gray-700">
        {others === 0 ? t("firstGuesser") : t("othersGuessed", { count: total })}
      </figcaption>

      {histogram.type === "slider" ? (
        <ul className="flex h-40 items-end gap-1 sm:gap-2" aria-label={t("othersGuessed", { count: total })}>
          {bars.map((b) => (
            <li key={b.key} className="relative flex h-full flex-1 flex-col items-center justify-end">
              {(b.isMine || b.isTruth) && (
                <span className="absolute -top-1 flex -translate-y-full flex-col items-center gap-0.5 text-[11px] font-bold leading-tight">
                  {b.isMine && <span className="rounded-full bg-fun-pink px-1.5 text-white">{t("you")}</span>}
                  {b.isTruth && <span className="rounded-full bg-fun-green px-1.5 text-green-900">{t("truth")}</span>}
                </span>
              )}
              <span
                aria-hidden
                className={`w-full rounded-t-md ${b.isTruth ? "bg-fun-green" : b.isMine ? "bg-fun-pink" : "bg-primary-300"}`}
                style={{ height: `${Math.max(4, (b.count / maxCount) * 100)}%` }}
              />
              <span className="sr-only">
                {b.label}: {pct(b.count)}%{b.isMine ? ` (${t("you")})` : ""}
                {b.isTruth ? ` (${t("truth")})` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-3">
          {bars.map((b) => (
            <li key={b.key}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="font-heading text-gray-800">
                  {b.label}
                  {b.isMine && <span className="ml-2 rounded-full bg-fun-pink px-2 py-0.5 text-xs font-bold text-white">{t("you")}</span>}
                  {b.isTruth && <span className="ml-2 rounded-full bg-fun-green px-2 py-0.5 text-xs font-bold text-green-900">{t("truth")}</span>}
                </span>
                <span className="font-mono text-gray-600">{pct(b.count)}%</span>
              </div>
              <div aria-hidden className="h-4 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${b.isTruth ? "bg-fun-green" : b.isMine ? "bg-fun-pink" : "bg-primary-300"}`}
                  style={{ width: `${total > 0 ? Math.max(2, (b.count / total) * 100) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {histogram.type === "slider" && (
        <div aria-hidden className="mt-2 flex justify-between text-xs text-gray-500">
          <span>{formatNumber(histogram.min, locale)}</span>
          <span>{formatNumber(histogram.max, locale)}</span>
        </div>
      )}
    </figure>
  );
}
