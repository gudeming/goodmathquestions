import { useMemo } from "react";
// Deep import keeps the rest of math-engine (adaptive, validator) out of the client bundle.
import { isEmptyNumberLine } from "@gmq/math-engine/src/rubric";
import { SCENE_REGISTRY } from "@/components/scenes/registry";
import { parseScene, peekSceneParser, useSceneParser, type SceneParser } from "@/components/scenes/scene-parser";

/**
 * True when a question's animationConfig is a valid scene worth a card. Invalid
 * configs, `{}` and the seed bank's empty number line render no card at all.
 *
 * Exact once the scene schemas are loaded (always on the server; in the browser they
 * are an async chunk, see `scene-parser.ts`). Before that it only checks that the
 * config names a registered scene type, so a valid scene keeps a stable card while
 * the chunk loads. Components should prefer `useHasScene`, which re-checks on load.
 */
export function hasScene(config: unknown, parse: SceneParser | null = peekSceneParser()): boolean {
  const ok = parse ? parseScene(parse, config).ok : namesRegisteredScene(config);
  return ok && !isEmptyNumberLine(config as Parameters<typeof isEmptyNumberLine>[0]);
}

/** `hasScene` that re-evaluates when the scene schemas finish loading. */
export function useHasScene(config: unknown): boolean {
  const parser = useSceneParser();
  return useMemo(() => hasScene(config, parser), [config, parser]);
}

function namesRegisteredScene(config: unknown): boolean {
  if (typeof config !== "object" || config === null || Array.isArray(config)) return false;
  const type = (config as { type?: unknown }).type;
  return typeof type === "string" && Object.prototype.hasOwnProperty.call(SCENE_REGISTRY, type);
}
