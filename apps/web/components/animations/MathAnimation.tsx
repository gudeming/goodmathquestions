"use client";

import { useLocale } from "next-intl";
import type { SceneEvent } from "@gmq/animation-engine";
import { SceneHost } from "@/components/scenes/SceneHost";

interface MathAnimationProps {
  /** Raw `question.animationConfig`; validated by SceneHost (invalid -> renders nothing). */
  config: unknown;
  /** Legacy flag: true plays the scene's reveal phase. */
  revealSolution?: boolean;
  onEvent?: (e: SceneEvent) => void;
  onProposeAnswer?: (value: string) => void;
}

/** Thin compatibility wrapper around SceneHost (engine v2). The scenes live in components/scenes/. */
export function MathAnimation({ config, revealSolution = false, onEvent, onProposeAnswer }: MathAnimationProps) {
  const locale = useLocale() === "zh" ? "zh" : "en";
  return <SceneHost config={config} phase={revealSolution ? "reveal" : "explore"} locale={locale} onEvent={onEvent} onProposeAnswer={onProposeAnswer} />;
}
