import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@gmq/api";

type Outputs = inferRouterOutputs<AppRouter>;
type Inputs = inferRouterInputs<AppRouter>;

export type PublicQuestion = Outputs["question"]["getById"];
export type Histogram = Outputs["guess"]["histogram"];
export type CheckResult = Outputs["question"]["checkAnswer"];
export type SubmitResult = Outputs["question"]["submitAnswer"];
export type RevealData = Outputs["question"]["reveal"];
export type PublicVariant = Outputs["question"]["variants"][number];
export type ExpressionRules = NonNullable<Outputs["question"]["expressionRules"]>;
export type EventName = Inputs["event"]["track"]["name"];
export type EventProps = NonNullable<Inputs["event"]["track"]["props"]>;
export type GuessConfig = NonNullable<PublicQuestion["guessConfig"]>;
export type AnswerType = PublicQuestion["answerType"];

export type Locale = "en" | "zh";
export interface Bi {
  en: string;
  zh: string;
}
/** A server Bi where either side may be missing. */
export interface LooseBi {
  en: string | null;
  zh: string | null;
}

/** Text in the page locale, falling back to the other language. */
export function pick(bi: LooseBi | Bi | null | undefined, locale: Locale): string {
  if (!bi) return "";
  return (locale === "zh" ? bi.zh || bi.en : bi.en || bi.zh) ?? "";
}

/** Answer value as the client holds it: arrays for MULTI_VALUE / ORDERING. */
export type AnswerDraft = string | string[];

export interface OptionItem {
  id: string;
  label: string;
}

export function formatNumber(n: number, locale: Locale): string {
  const abs = Math.abs(n);
  const maxDigits = abs !== 0 && abs < 1 ? 4 : abs < 100 ? 2 : 0;
  try {
    return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: maxDigits }).format(n);
  } catch {
    return String(n);
  }
}
