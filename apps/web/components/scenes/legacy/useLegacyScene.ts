"use client";

import { useMemo } from "react";
import { SceneBuilder, type AnimationConfig, type AnimationScene, type LegacySceneConfig } from "@gmq/animation-engine";

/** Legacy adapter: parsed v2 config -> v1 SceneBuilder scene. */
export function useLegacyScene(config: LegacySceneConfig): AnimationScene {
  return useMemo(() => SceneBuilder.build(config as AnimationConfig), [config]);
}
