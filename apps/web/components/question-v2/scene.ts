import { parseSceneConfig } from "@gmq/animation-engine";
// Deep import keeps the rest of math-engine (adaptive, validator) out of the client bundle.
import { isEmptyNumberLine } from "@gmq/math-engine/src/rubric";

/**
 * True when a question's animationConfig is a valid scene worth a card. Invalid
 * configs, `{}` and the seed bank's empty number line render no card at all.
 */
export function hasScene(config: unknown): boolean {
  if (!parseSceneConfig(config).ok) return false;
  return !isEmptyNumberLine(config as Parameters<typeof isEmptyNumberLine>[0]);
}
