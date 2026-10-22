"use client";

import { useTranslations } from "next-intl";
import type { FlowPhase } from "./useQuestionFlow";

const STEPS: Array<{ phase: FlowPhase; key: "stageGuess" | "stageExplore" | "stageReveal"; icon: string }> = [
  { phase: "hook", key: "stageGuess", icon: "🤔" },
  { phase: "explore", key: "stageExplore", icon: "🛠️" },
  { phase: "reveal", key: "stageReveal", icon: "💡" },
];

/** Three-step indicator at the top of a hero question. Informational, not a control. */
export function StageProgress({ phase }: { phase: FlowPhase }) {
  const t = useTranslations("questions");
  const current = STEPS.findIndex((s) => s.phase === phase);

  return (
    <nav aria-label={t("progressLabel")} className="mb-6">
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((step, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li key={step.phase} className="flex flex-1 items-center gap-2 sm:gap-3" aria-current={state === "current" ? "step" : undefined}>
              <span
                aria-hidden
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-bold sm:h-10 sm:w-10 ${
                  state === "current"
                    ? "bg-gradient-to-r from-primary-500 to-fun-purple text-white shadow-md"
                    : state === "done"
                    ? "bg-fun-green/20 text-green-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {state === "done" ? "✓" : step.icon}
              </span>
              <span className={`font-heading text-sm sm:text-base ${state === "current" ? "font-bold text-gray-800" : "text-gray-500"}`}>
                {t(step.key)}
                {state !== "todo" && (
                  <span className="sr-only"> ({state === "done" ? t("stepStatusDone") : t("stepStatusCurrent")})</span>
                )}
              </span>
              {i < STEPS.length - 1 && (
                <span aria-hidden className={`hidden h-1 flex-1 rounded-full sm:block ${i < current ? "bg-fun-green/50" : "bg-gray-200"}`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
