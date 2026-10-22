/** Pure helpers for chessboard_doubling (A2) and fold_paper (A3): exponential growth. */

/** Grains on square k (1-based) when square 1 holds `start`: start * 2^(k-1). Exact (BigInt) decimal string. */
export function grainsOnSquare(k: number, start = 1): string {
  assertSquare(k, start);
  return (BigInt(start) * 2n ** BigInt(k - 1)).toString();
}

/** Grains on squares 1..k together: start * (2^k - 1). Exact decimal string. */
export function totalGrains(k: number, start = 1): string {
  assertSquare(k, start);
  return (BigInt(start) * (2n ** BigInt(k) - 1n)).toString();
}

function assertSquare(k: number, start: number) {
  if (!Number.isInteger(k) || k < 1) throw new RangeError(`square must be a positive integer, got ${k}`);
  if (!Number.isInteger(start) || start < 1) throw new RangeError(`start must be a positive integer, got ${start}`);
}

/** Insert thousands separators into a non-negative integer string (BigInt-safe). */
export function groupDigits(digits: string, separator = ","): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/** Approximate log10 of a non-negative integer string (works far beyond 2^53). */
export function log10Digits(digits: string): number {
  const d = digits.replace(/^0+/, "");
  if (d === "") return -Infinity;
  const head = Number(d.slice(0, 15));
  return Math.log10(head) + Math.max(0, d.length - 15);
}

/** Short scientific form, e.g. "1.8 × 10^19" (for numbers too long to read). */
export function scientific(digits: string, significant = 2): string {
  const d = digits.replace(/^0+/, "") || "0";
  if (d.length <= 6) return d;
  const mantissa = `${d[0]}${significant > 1 ? `.${d.slice(1, significant)}` : ""}`;
  return `${mantissa} × 10^${d.length - 1}`;
}

/** A typical grain of milled rice weighs 20–30 mg; 25 mg gives 40,000 grains per kg. */
export const RICE_GRAIN_MG = 25;
export const RICE_GRAINS_PER_KG = 1_000_000 / RICE_GRAIN_MG;
/** World rice production, roughly 500 million tonnes a year (2020s). */
export const WORLD_RICE_TONNES_PER_YEAR = 500_000_000;

/**
 * Rice comparisons for the doubling scene (approximate grain counts at 40,000 grains per kg).
 * A bowl ~ 200 g, a sack 50 kg, a truck ~ 20 t, the world's annual harvest ~ 500 Mt.
 * The full board (2^64 − 1 grains) comes to about 920 years of the world's rice.
 */
export const RICE_REFERENCES = [
  { id: "bowl", grains: 0.2 * RICE_GRAINS_PER_KG, label: { en: "a bowl of rice", zh: "一碗米" } },
  { id: "sack", grains: 50 * RICE_GRAINS_PER_KG, label: { en: "a 50 kg sack", zh: "一袋 50 公斤的米" } },
  { id: "truck", grains: 20_000 * RICE_GRAINS_PER_KG, label: { en: "a truck of rice", zh: "一卡车米" } },
  { id: "world", grains: WORLD_RICE_TONNES_PER_YEAR * 1000 * RICE_GRAINS_PER_KG, label: { en: "the world's rice for a year", zh: "全世界一年的大米" } },
] as const;

/** How many years of world rice production a grain count represents. */
export function worldRiceYears(digits: string): number {
  return 10 ** (log10Digits(digits) - Math.log10(RICE_REFERENCES[3].grains));
}

/** Paper thickness after `folds` folds: thickness * 2^folds (mm). thicknessAfter(10) = 102.4. */
export function thicknessAfter(folds: number, thicknessMm = 0.1): number {
  if (!Number.isInteger(folds) || folds < 0) throw new RangeError(`folds must be a non-negative integer, got ${folds}`);
  return thicknessMm * 2 ** folds;
}

/** Fewest folds whose thickness reaches `heightMm`. */
export function foldsToReach(heightMm: number, thicknessMm = 0.1): number {
  if (heightMm <= thicknessMm) return 0;
  // Guard against float error just below a power of two (e.g. 102.4 / 0.1).
  const k = Math.ceil(Math.log2(heightMm / thicknessMm) - 1e-9);
  return thicknessAfter(k, thicknessMm) >= heightMm * (1 - 1e-12) ? k : k + 1;
}

/** Real paper stops folding around here (the famous "you can't fold it more than 7 times"). */
export const REAL_FOLD_LIMIT = 7;

/** Human-friendly length: mm / cm / m / km. */
export function formatLength(mm: number, locale: "en" | "zh" = "en"): string {
  const fmt = (v: number) => (v >= 100 ? Math.round(v).toLocaleString(locale === "zh" ? "zh-CN" : "en-US") : String(Number(v.toPrecision(3))));
  if (mm < 10) return `${fmt(mm)} mm`;
  if (mm < 1000) return `${fmt(mm / 10)} cm`;
  if (mm < 1_000_000) return `${fmt(mm / 1000)} m`;
  return `${fmt(mm / 1_000_000)} km`;
}
