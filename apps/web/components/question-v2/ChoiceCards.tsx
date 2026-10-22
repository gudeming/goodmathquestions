"use client";

import { useRef, type KeyboardEvent } from "react";
import { MathText } from "@/components/ui/MathText";
import type { OptionItem } from "./types";

interface ChoiceCardsProps {
  options: OptionItem[];
  value: string | null;
  onChange: (id: string) => void;
  /** id of the element that labels the group */
  labelledBy?: string;
  ariaLabel?: string;
  disabled?: boolean;
  /** Called on Enter when an option is already selected (submit shortcut). */
  onConfirm?: () => void;
  layout?: "grid" | "row";
}

/**
 * Keyboard-navigable radio group of big cards (WAI-ARIA radio pattern): one tab
 * stop, arrow keys move and select, Space/Enter select, Enter again confirms.
 */
export function ChoiceCards({ options, value, onChange, labelledBy, ariaLabel, disabled, onConfirm, layout = "grid" }: ChoiceCardsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex((o) => o.id === value);
  const tabIndexFor = (i: number) => (selectedIndex === -1 ? (i === 0 ? 0 : -1) : i === selectedIndex ? 0 : -1);

  const move = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length;
    refs.current[next]?.focus();
    onChange(options[next].id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      move(i, 1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      move(i, -1);
    } else if (e.key === "Enter" && options[i].id === value && onConfirm) {
      e.preventDefault();
      onConfirm();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : ariaLabel}
      aria-disabled={disabled || undefined}
      className={layout === "row" ? "flex flex-col gap-3 sm:flex-row" : "grid gap-3 sm:grid-cols-2"}
    >
      {options.map((o, i) => {
        const checked = o.id === value;
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={tabIndexFor(i)}
            disabled={disabled}
            onClick={() => onChange(o.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`min-h-[56px] flex-1 rounded-card border-2 px-4 py-3 text-left font-heading text-lg transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-fun-cyan/50 disabled:cursor-not-allowed disabled:opacity-60 ${
              checked
                ? "border-primary-500 bg-primary-50 text-primary-800 shadow-md"
                : "border-primary-100 bg-white text-gray-800 hover:border-fun-cyan"
            }`}
          >
            <span className="flex items-center gap-3">
              <span
                aria-hidden
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  checked ? "border-primary-500 bg-primary-500" : "border-gray-300"
                }`}
              >
                {checked && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
              </span>
              <MathText text={o.label} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
