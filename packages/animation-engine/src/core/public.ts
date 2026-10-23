import type { SceneConfigType } from "../schema";

/**
 * Scene fields that state the answer outright. They exist so the build can cross-check a scene
 * against its question (the "Answer-bearing" fields in the schemas), and the scene components compute
 * everything they play from the other fields. Clients get them only after the reveal.
 *
 * Not listed: divisor_blocks `highlight` (the explore game needs it to know which numbers to find).
 */
export const ANSWER_FIELDS: Partial<Record<SceneConfigType, readonly string[]>> = {
  number_trick_stepper: ["expectFixedPoint", "expectDivisibleBy"],
  bridges_trace: ["solvable"],
  clock_overlap: ["overlaps"],
  tiling_lab: ["tilers"],
  domino_tiling: ["tileable"],
  staircase_paths: ["ways"],
  pascal_triangle: ["rowSum"],
  calendar_grid: ["sum"],
  cycle_timeline: ["collision"],
  frog_puzzle: ["minMoves"],
  water_jugs: ["minSteps"],
  queens_board: ["solutions"],
  guess_game: ["minGuesses"],
  trains_fly: ["flyKm"],
  // Correct expressions, shown in the reveal.
  expression_builder: ["solutions"],
};

/**
 * A scene config as a client may see it before the reveal: the answer fields removed. Works on raw
 * (unparsed) JSON; anything that isn't a known scene object comes back unchanged.
 */
export function publicSceneConfig<T>(config: T): T {
  if (typeof config !== "object" || config === null || Array.isArray(config)) return config;
  const type = (config as { type?: unknown }).type;
  const fields = typeof type === "string" ? ANSWER_FIELDS[type as SceneConfigType] : undefined;
  if (!fields) return config;
  const copy: Record<string, unknown> = { ...(config as Record<string, unknown>) };
  for (const f of fields) delete copy[f];
  return copy as T;
}
