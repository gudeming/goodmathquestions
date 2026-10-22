/**
 * Scene contract (engine v2). See docs/plans/good-questions-overhaul/03-scene-catalog.md §1.2.
 *
 * A scene is the question: the child's operations change the picture and the
 * picture answers the question. The host owns the phase; the scene owns its state.
 */

/**
 * - `hook`    : static (or gently looping) poster state, not operable. Used on cards and the Act 1 backdrop.
 * - `explore` : operable.
 * - `reveal`  : plays the "why"; operations are disabled; fires `reveal_done` when finished.
 */
export type ScenePhase = "hook" | "explore" | "reveal";

/**
 * Events every scene must emit:
 * - `interact`    first operation of any kind (streak + funnel)
 * - `state`       summary of each state change (e.g. `{ pairs: 12 }`), throttled to <= 2/s
 * - `completed`   in-scene goal reached; props include `{ moves }` where meaningful
 * - `reveal_done` reveal playback finished
 * The host additionally emits `scene_config_invalid` and `scene_error`.
 */
export interface SceneEvent {
  name: string;
  props?: Record<string, unknown>;
}

export interface SceneProps<C> {
  config: C;
  phase: ScenePhase;
  locale: "en" | "zh";
  /** From `useReducedMotion()`; when true, motion becomes <= 200 ms fades. */
  reducedMotion: boolean;
  onEvent: (e: SceneEvent) => void;
  /** The scene can put a value the child produced into the answer box (never auto-submits). */
  onProposeAnswer?: (value: string) => void;
}

/** Bilingual label used inside scene configs. */
export interface Bilingual {
  en: string;
  zh: string;
}
