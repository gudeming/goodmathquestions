import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { SceneConfigOf, SceneConfigType, SceneProps } from "@gmq/animation-engine";

export type SceneComponent<T extends SceneConfigType> = ComponentType<SceneProps<SceneConfigOf<T>>>;
export type SceneRegistry = { [T in SceneConfigType]: LazyExoticComponent<SceneComponent<T>> };

/**
 * Scene type -> lazily loaded component. Each scene is its own chunk so a question
 * page only downloads the scene it shows. Adding a type to the schema without
 * registering it here is a type error.
 */
export const SCENE_REGISTRY: SceneRegistry = {
  gauss_pairing: lazy(() => import("./GaussPairingScene")),
  handshake_graph: lazy(() => import("./HandshakeGraphScene")),
  grid_squares: lazy(() => import("./GridSquaresScene")),
  number_trick_stepper: lazy(() => import("./NumberTrickStepperScene")),
  monty_hall: lazy(() => import("./MontyHallScene")),
  // Legacy v1 types (DRILL only; frozen).
  pizza_slice: lazy(() => import("./legacy/PizzaSliceScene")),
  balance_scale: lazy(() => import("./legacy/BalanceScaleScene")),
  number_journey: lazy(() => import("./legacy/NumberJourneyScene")),
  triangle_angles: lazy(() => import("./legacy/TriangleAnglesScene")),
  candy_jar: lazy(() => import("./legacy/CandyJarScene")),
  staircase: lazy(() => import("./legacy/StaircaseScene")),
  magic_square: lazy(() => import("./legacy/MagicSquareScene")),
  number_combine: lazy(() => import("./legacy/NumberCombineScene")),
};
