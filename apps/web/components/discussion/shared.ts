import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@gmq/api";
import { formatNumber, pick, type GuessConfig, type Locale, type OptionItem } from "@/components/question-v2/types";

type Outputs = inferRouterOutputs<AppRouter>;
type Inputs = inferRouterInputs<AppRouter>;

export type CommentList = Outputs["comment"]["list"];
export type ListedComment = CommentList["comments"][number];
export type ListedReply = ListedComment["replies"][number];
export type PendingComment = CommentList["myPending"][number];
export type GuessSplit = Outputs["comment"]["guessSplit"];
export type ReportReason = Inputs["comment"]["report"]["reason"];

/** The server's SolutionTag union (web does not depend on @gmq/math-engine directly). */
export type SolutionTag = NonNullable<Inputs["comment"]["list"]["solutionTag"]>;

/** Display order of the chips; `Record` keeps it in sync with the server union. */
const TAG_ORDER: Record<SolutionTag, number> = {
  draw: 0,
  pair: 1,
  table: 2,
  guess_check: 3,
  simulate: 4,
  algebra: 5,
  pattern: 6,
  work_backwards: 7,
  other: 8,
};
export const SOLUTION_TAGS = (Object.keys(TAG_ORDER) as SolutionTag[]).sort((a, b) => TAG_ORDER[a] - TAG_ORDER[b]);

export const REPORT_REASONS: readonly ReportReason[] = ["mean", "personal_info", "inappropriate", "spam", "other"];

export const TAG_EMOJI: Record<SolutionTag, string> = {
  draw: "✏️",
  pair: "🤝",
  table: "📋",
  guess_check: "🔢",
  simulate: "🎲",
  algebra: "🔣",
  pattern: "🧩",
  work_backwards: "↩️",
  other: "💡",
};

export function isSolutionTag(value: string | null | undefined): value is SolutionTag {
  return typeof value === "string" && (SOLUTION_TAGS as readonly string[]).includes(value);
}

const SAME = { en: "Same", zh: "一样" };

/**
 * Columns for the "who thinks what" bar: the options of a choice guess, or left / right /
 * same for a compare guess. Undefined for slider guesses (they have a histogram instead).
 */
export function guessOptionsFor(config: GuessConfig | null | undefined, locale: Locale): OptionItem[] | undefined {
  if (!config) return undefined;
  if (config.type === "choice") return config.options.map((o) => ({ id: o.id, label: pick(o, locale) || o.id }));
  if (config.type === "compare") {
    return [
      { id: "left", label: pick(config.left, locale) },
      { id: "right", label: pick(config.right, locale) },
      { id: "same", label: pick(SAME, locale) },
    ];
  }
  return undefined;
}

/** How a stored guess reads next to a comment: the option label, or a formatted number. */
export function guessLabel(value: string, options: OptionItem[] | undefined, locale: Locale): string {
  const option = options?.find((o) => o.id === value);
  if (option) return option.label;
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) ? formatNumber(n, locale) : value;
}

/** tRPC error -> discussion i18n key for the composer's error line. */
export function errorKey(err: unknown): "errors.tooFast" | "errors.duplicate" | "errors.length" | "errors.failed" {
  const e = err as { message?: string; data?: { code?: string } } | null;
  if (e?.message === "COMMENT_RATE_LIMITED" || e?.data?.code === "TOO_MANY_REQUESTS") return "errors.tooFast";
  if (e?.message === "COMMENT_DUPLICATE") return "errors.duplicate";
  if (e?.message === "COMMENT_LENGTH") return "errors.length";
  return "errors.failed";
}
