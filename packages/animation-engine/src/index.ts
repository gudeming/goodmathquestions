// Legacy v1 pipeline (DRILL questions only; frozen).
export { SceneBuilder } from "./core/scene-builder";
export type { AnimationConfig, AnimationScene, SceneType } from "./core/types";

// v2 scene contract.
export type { ScenePhase, SceneEvent, SceneProps, Bilingual } from "./core/contract";

// v2 schemas.
export {
  SceneConfigSchema,
  parseSceneConfig,
  isLegacySceneType,
  LEGACY_SCENE_TYPES,
  NEW_SCENE_TYPES,
  SCENE_TYPES,
  GaussPairingSchema,
  HandshakeGraphSchema,
  GridSquaresSchema,
  NumberTrickStepperSchema,
  MontyHallSchema,
} from "./schema";
export type {
  SceneConfig,
  SceneConfigInput,
  SceneConfigType,
  SceneConfigOf,
  ParseSceneResult,
  LegacySceneType,
  LegacySceneConfig,
  GaussPairingConfig,
  HandshakeGraphConfig,
  GridSquaresConfig,
  NumberTrickStepperConfig,
  MontyHallConfig,
} from "./schema";
export { SAMPLE_SCENE_CONFIGS, TRICK_SAMPLES } from "./samples";

// Pure scene helpers (shared by components, validators and tests).
export { mulberry32, randomInt, shuffle } from "./scenes/random";
export type { Rng } from "./scenes/random";
export { handshakes, countSquares, squaresOfSize, triangular, pairKey } from "./scenes/counting";
export {
  runTrick,
  checkTrickInput,
  randomTrickInput,
  trickEdgeInputs,
  trickWidth,
  formatTrickStep,
  trickInputRange,
  reverseNumber,
  digitsOf,
  linearTrace,
  formatLinear,
  TRICK_OPS,
  TRICK_CONSTRAINTS,
} from "./scenes/number-trick";
export type {
  TrickOp,
  TrickConstraint,
  TrickStepSpec,
  TrickConfigLike,
  TrickRun,
  TrickStepResult,
  TrickInputCheck,
  LinearForm,
} from "./scenes/number-trick";
export { hostOpens, playMontyRound, addMontyRound, simulateMonty, montyOdds, EMPTY_MONTY_STATS } from "./scenes/monty-hall";
export type { MontyRound, MontyStats, MontyStrategy } from "./scenes/monty-hall";
