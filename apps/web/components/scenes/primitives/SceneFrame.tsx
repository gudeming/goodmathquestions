"use client";

import type { KeyboardEvent, ReactNode } from "react";

interface SceneFrameProps {
  label: string;
  /** Hook posters are not operable. */
  inert?: boolean;
  children: ReactNode;
  className?: string;
}

/** Common scene shell: full width, 280 px tall on phones, 360 px from `sm` up. */
export function SceneFrame({ label, inert = false, children, className = "" }: SceneFrameProps) {
  return (
    <div
      role="group"
      aria-label={label}
      aria-disabled={inert || undefined}
      className={`relative flex h-[280px] w-full select-none flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-primary-50 to-white p-2 font-heading text-gray-700 sm:h-[360px] sm:p-3 ${inert ? "pointer-events-none" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

interface SceneButtonProps {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "accent";
  ariaLabel?: string;
  ariaPressed?: boolean;
  className?: string;
}

const VARIANTS = {
  primary: "bg-primary-500 text-white hover:bg-primary-600",
  accent: "bg-fun-pink text-white hover:brightness-105",
  ghost: "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50",
} as const;

/** Touch-friendly button: >= 44 x 44 px target. */
export function SceneButton({ onClick, children, disabled, variant = "primary", ariaLabel, ariaPressed, className = "" }: SceneButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className={`min-h-[44px] min-w-[44px] rounded-full px-3 text-xs font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-fun-yellow disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Small labelled number pill. */
export function Counter({ label, value, tone = "primary" }: { label: string; value: ReactNode; tone?: "primary" | "pink" | "green" }) {
  const toneClass = { primary: "text-primary-700 bg-primary-100", pink: "text-fun-pink bg-fun-pink/10", green: "text-green-700 bg-fun-green/20" }[tone];
  return (
    <div className={`inline-flex items-baseline gap-1 rounded-full px-3 py-1 ${toneClass}`} aria-live="polite">
      <span className="text-xs">{label}</span>
      <span className="text-lg font-bold tabular-nums">{value}</span>
    </div>
  );
}

/** One-line status message; polite live region so screen readers hear feedback. */
export function SceneMessage({ children }: { children: ReactNode }) {
  return (
    <p className="min-h-[1.25rem] text-center text-xs text-gray-500 sm:text-sm" aria-live="polite">
      {children}
    </p>
  );
}

/** Move focus among sibling controls with arrow keys (roving focus without state). */
export function focusSibling(e: KeyboardEvent, selector: string): boolean {
  const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  const delta = keys[e.key];
  if (!delta) return false;
  const container = e.currentTarget as HTMLElement | SVGElement;
  const items = Array.from(container.querySelectorAll<HTMLElement | SVGElement>(selector));
  const idx = items.indexOf(document.activeElement as HTMLElement);
  if (idx < 0 || items.length === 0) return false;
  e.preventDefault();
  items[(idx + delta + items.length) % items.length].focus();
  return true;
}
