import { DEFAULT_HINT_TEXTS } from "@gmq/math-engine/src/rubric";
import type { Bi } from "./types";

const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const DEFAULT_SET = new Set(DEFAULT_HINT_TEXTS.flatMap((h) => [normalise(h.en), normalise(h.zh)]));

/** Question hints as stored (JSON), minus malformed entries and the old generic defaults. */
export function usableHints(raw: unknown): Bi[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((h): h is Bi => {
    if (typeof h !== "object" || h === null) return false;
    const { en, zh } = h as { en?: unknown; zh?: unknown };
    if (typeof en !== "string" || typeof zh !== "string" || (en.trim() === "" && zh.trim() === "")) return false;
    return !DEFAULT_SET.has(normalise(en)) && !DEFAULT_SET.has(normalise(zh));
  });
}
