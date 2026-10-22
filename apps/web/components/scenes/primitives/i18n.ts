import type { Bilingual } from "@gmq/animation-engine";

export type SceneLocale = "en" | "zh";

/** Pick the string for the current locale. */
export function tr(locale: SceneLocale, en: string, zh: string): string {
  return locale === "zh" ? zh : en;
}

export function bi(locale: SceneLocale, label: Bilingual): string {
  return locale === "zh" ? label.zh : label.en;
}

export function formatNumber(n: number, locale: SceneLocale): string {
  return n.toLocaleString(locale === "zh" ? "zh-CN" : "en-US");
}
