"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { MathText } from "@/components/ui/MathText";
import { pick, type Bi, type Locale } from "./types";
import type { Track } from "./useTrack";

interface HintLadderProps {
  hints: Bi[];
  revealed: number;
  onReveal: () => void;
  locale: Locale;
  /** Analytics for the question; fires `hint_reveal` with the 1-based hint index. */
  track?: Track;
}

/** Hints shown one at a time; the count is owned by the flow (persisted, sent as hintsUsed). */
export function HintLadder({ hints, revealed, onReveal, locale, track }: HintLadderProps) {
  const t = useTranslations("questions");
  const reduced = useReducedMotion();
  const lastRef = useRef<HTMLLIElement>(null);
  const prev = useRef(revealed);

  // Move focus to a newly revealed hint so keyboard and screen reader users land on it,
  // and report it. Only increases count: restoring a persisted count on load starts at
  // that count, so a refresh doesn't re-send old reveals.
  useEffect(() => {
    if (revealed > prev.current) {
      lastRef.current?.focus();
      if (revealed <= hints.length) track?.("hint_reveal", { index: revealed });
    }
    prev.current = revealed;
  }, [revealed, hints.length, track]);

  if (hints.length === 0) return null;
  const shown = Math.min(revealed, hints.length);

  return (
    <section aria-labelledby="hint-ladder-title" className="rounded-card border-2 border-fun-purple/20 bg-gradient-to-r from-fun-purple/10 to-fun-pink/10 p-5" data-testid="hint-ladder">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="hint-ladder-title" className="font-heading text-lg font-bold text-gray-800">
          💡 {t("hintsTitle")}
        </h3>
        {shown < hints.length ? (
          <button
            type="button"
            onClick={onReveal}
            className="min-h-[44px] rounded-bubble bg-fun-purple px-4 py-2 font-heading text-sm font-medium text-white transition-colors hover:bg-fun-purple/80 focus:outline-none focus-visible:ring-4 focus-visible:ring-fun-purple/40"
            data-testid="hint-button"
          >
            {t("hintButton", { current: shown + 1, total: hints.length })}
          </button>
        ) : (
          <span className="text-sm text-gray-500">{t("noMoreHints")}</span>
        )}
      </div>

      {shown > 0 && (
        <ol className="mt-4 space-y-3">
          {hints.slice(0, shown).map((hint, i) => (
            <motion.li
              key={i}
              ref={i === shown - 1 ? lastRef : undefined}
              tabIndex={-1}
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: reduced ? 0.15 : 0.3 }}
              className="flex items-start gap-3 rounded-bubble bg-white/80 px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-fun-purple"
            >
              <span className="mt-0.5 shrink-0 text-sm font-bold text-fun-purple">{t("hintLabel", { n: i + 1 })}</span>
              <MathText as="p" className="font-body text-gray-700" text={pick(hint, locale)} />
            </motion.li>
          ))}
        </ol>
      )}
    </section>
  );
}
