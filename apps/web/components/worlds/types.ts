import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@gmq/api";

type Outputs = inferRouterOutputs<AppRouter>;

export type Locale = "en" | "zh";

/** A world as collection.list returns it (plain JSON). */
export type WorldInfo = Outputs["collection"]["list"][number];

/** Today's puzzle, reduced to what the card shows (plain JSON, safe to pass from the server). */
export interface TodayPuzzle {
  id: string;
  slug: string | null;
  titleEn: string;
  titleZh: string;
  hookEn: string | null;
  hookZh: string | null;
  animationConfig: unknown;
  guessCount: number;
}

/** A hero question on a world path: the hook, never the prompt. */
export interface WorldQuestionCard {
  id: string;
  slug: string | null;
  titleEn: string;
  titleZh: string;
  hookEn: string | null;
  hookZh: string | null;
  ageGroup: string;
}

/** Text in the page locale, falling back to the other language. */
export function pickText(en: string | null | undefined, zh: string | null | undefined, locale: Locale): string {
  return (locale === "zh" ? zh || en : en || zh) ?? "";
}

/**
 * Locale-prefixed path for links ("as-needed": English has no prefix). Kept
 * here instead of importing lib/seo so client bundles don't pull @gmq/i18n's
 * message JSON.
 */
export function localePath(locale: Locale, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (locale === "en") return p;
  return p === "/" ? `/${locale}` : `/${locale}${p}`;
}

/** Question URL: the slug for hero questions, the id otherwise. */
export function questionPath(locale: Locale, q: { id: string; slug: string | null }): string {
  return localePath(locale, `/questions/${q.slug ?? q.id}`);
}

const AGE_LABELS: Record<string, string> = {
  AGE_8_10: "8–10",
  AGE_10_12: "10–12",
  AGE_12_14: "12–14",
  AGE_14_16: "14–16",
  AGE_16_18: "16–18",
};

export function ageLabel(ageGroup: string): string {
  return AGE_LABELS[ageGroup] ?? "";
}

/**
 * Static classes per Collection.colorToken (Tailwind can't see dynamic class
 * names). Unknown tokens fall back to purple.
 */
export const WORLD_COLORS: Record<string, { ring: string; soft: string; border: string; text: string }> = {
  "fun-purple": { ring: "text-fun-purple", soft: "from-fun-purple/15 to-fun-pink/10", border: "border-fun-purple/30", text: "text-purple-700" },
  "fun-cyan": { ring: "text-fun-cyan", soft: "from-fun-cyan/15 to-primary-100/60", border: "border-fun-cyan/40", text: "text-cyan-700" },
  "fun-green": { ring: "text-fun-green", soft: "from-fun-green/15 to-fun-cyan/10", border: "border-fun-green/40", text: "text-green-700" },
  "fun-pink": { ring: "text-fun-pink", soft: "from-fun-pink/15 to-fun-purple/10", border: "border-fun-pink/40", text: "text-pink-700" },
  "fun-orange": { ring: "text-fun-orange", soft: "from-fun-orange/15 to-fun-yellow/10", border: "border-fun-orange/40", text: "text-orange-700" },
  "fun-yellow": { ring: "text-fun-yellow", soft: "from-fun-yellow/20 to-fun-orange/10", border: "border-fun-yellow/50", text: "text-amber-700" },
};

export function worldColors(token: string) {
  return WORLD_COLORS[token] ?? WORLD_COLORS["fun-purple"];
}
