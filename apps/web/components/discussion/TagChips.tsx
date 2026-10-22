"use client";

import { useTranslations } from "next-intl";
import { TAG_EMOJI, type SolutionTag } from "./shared";

interface TagChipsProps {
  tags: readonly SolutionTag[];
  value: SolutionTag | null;
  onChange: (tag: SolutionTag | null) => void;
  /** Accessible name of the group. */
  label: string;
  /** Filter mode: an "All" chip first, and a count on each chip. */
  counts?: Partial<Record<SolutionTag, number>>;
  allCount?: number;
  disabled?: boolean;
  size?: "sm" | "md";
}

const BASE =
  "inline-flex min-h-[40px] items-center gap-1 rounded-full border-2 px-3 font-heading font-semibold transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-fun-cyan/50 disabled:cursor-not-allowed disabled:opacity-50";
const ON = "border-primary-500 bg-primary-500 text-white shadow";
const OFF = "border-primary-100 bg-white text-gray-700 hover:border-primary-300";

/**
 * A row of toggle chips for solution tags. In the composer a second click clears the
 * choice; in filter mode the "All" chip clears it.
 */
export function TagChips({ tags, value, onChange, label, counts, allCount, disabled, size = "md" }: TagChipsProps) {
  const t = useTranslations("discussion");
  const text = size === "sm" ? "text-xs" : "text-sm";
  const filterMode = counts !== undefined;

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {filterMode && (
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          disabled={disabled}
          className={`${BASE} ${text} ${value === null ? ON : OFF}`}
          data-testid="tag-filter-all"
        >
          {t("filterAll")}
          {allCount !== undefined && <span className="opacity-80">· {allCount}</span>}
        </button>
      )}
      {tags.map((tag) => {
        const on = value === tag;
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on && !filterMode ? null : tag)}
            disabled={disabled}
            className={`${BASE} ${text} ${on ? ON : OFF}`}
            data-testid={`tag-chip-${tag}`}
          >
            <span aria-hidden>{TAG_EMOJI[tag]}</span>
            {t(`tags.${tag}`)}
            {counts?.[tag] !== undefined && <span className="opacity-80">· {counts[tag]}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** A small read-only tag label on a comment. */
export function TagBadge({ tag }: { tag: SolutionTag }) {
  const t = useTranslations("discussion");
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 font-heading text-xs font-semibold text-primary-700">
      <span aria-hidden>{TAG_EMOJI[tag]}</span>
      {t(`tags.${tag}`)}
    </span>
  );
}
