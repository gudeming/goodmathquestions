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
  chessboard_doubling: lazy(() => import("./ChessboardDoublingScene")),
  fold_paper: lazy(() => import("./FoldPaperScene")),
  dice_lab: lazy(() => import("./DiceLabScene")),
  birthday_room: lazy(() => import("./BirthdayRoomScene")),
  tower_of_hanoi: lazy(() => import("./TowerOfHanoiScene")),
  river_crossing: lazy(() => import("./RiverCrossingScene")),
  fence_shaper: lazy(() => import("./FenceShaperScene")),
  visual_pattern: lazy(() => import("./VisualPatternScene")),
  pizza_cuts: lazy(() => import("./PizzaCutsScene")),
  balance_lab: lazy(() => import("./BalanceLabScene")),
  illustration: lazy(() => import("./IllustrationScene")),
  // Tier 2, batch 3a.
  scale_ladder: lazy(() => import("./ScaleLadderScene")),
  halving_bar: lazy(() => import("./HalvingBarScene")),
  circle_rope: lazy(() => import("./CircleRopeScene")),
  pythagoras_squares: lazy(() => import("./PythagorasSquaresScene")),
  bridges_trace: lazy(() => import("./BridgesTraceScene")),
  clock_overlap: lazy(() => import("./ClockOverlapScene")),
  coin_flips: lazy(() => import("./CoinFlipsScene")),
  sock_drawer: lazy(() => import("./SockDrawerScene")),
  pi_darts: lazy(() => import("./PiDartsScene")),
  collatz_path: lazy(() => import("./CollatzPathScene")),
  digit_slide: lazy(() => import("./DigitSlideScene")),
  fib_spiral: lazy(() => import("./FibSpiralScene")),
  divisor_blocks: lazy(() => import("./DivisorBlocksScene")),
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
