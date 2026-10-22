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
  ChessboardDoublingSchema,
  FoldPaperSchema,
  DiceLabSchema,
  BirthdayRoomSchema,
  TowerOfHanoiSchema,
  RiverCrossingSchema,
  FenceShaperSchema,
  VisualPatternSchema,
  PizzaCutsSchema,
  BalanceLabSchema,
  IllustrationSchema,
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
  ChessboardDoublingConfig,
  FoldPaperConfig,
  DiceLabConfig,
  BirthdayRoomConfig,
  TowerOfHanoiConfig,
  RiverCrossingConfig,
  FenceShaperConfig,
  VisualPatternConfig,
  PizzaCutsConfig,
  BalanceLabConfig,
  IllustrationConfig,
} from "./schema";
export { SAMPLE_SCENE_CONFIGS, TRICK_SAMPLES, MODE_SAMPLES } from "./samples";

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
export {
  grainsOnSquare,
  totalGrains,
  groupDigits,
  log10Digits,
  scientific,
  worldRiceYears,
  RICE_REFERENCES,
  thicknessAfter,
  foldsToReach,
  formatLength,
  REAL_FOLD_LIMIT,
} from "./scenes/doubling";
export {
  sumCounts,
  sumDistribution,
  modeSums,
  productParity,
  targetHitProbability,
  expectedRollsUntil,
  rollDice,
  rollsUntilTarget,
  diceTrial,
  simulateDice,
} from "./scenes/dice";
export type { DiceMode } from "./scenes/dice";
export {
  pAnyPair,
  pMatchMe,
  birthdayProbability,
  birthdayThreshold,
  birthdayMaxPeople,
  randomRoom,
  simulateBirthdays,
  DAYS_IN_YEAR,
  BIRTHDAY_DEFAULT_MAX,
} from "./scenes/birthday";
export type { BirthdayMode, BirthdayRoom } from "./scenes/birthday";
export { minMoves, optimalSequence, initialHanoi, topDisc, isLegalMove, applyHanoiMove, isHanoiSolved } from "./scenes/hanoi";
export type { HanoiState, HanoiMove } from "./scenes/hanoi";
export {
  shortestSolution,
  initialRiverState,
  bankOf,
  riverConflicts,
  isRiverStateValid,
  isRiverSolved,
  canCross,
  crossRiver,
  riverTimeline,
  WOLF_GOAT_CABBAGE,
  RIVER_MAX_ITEMS,
} from "./scenes/river";
export type { Bank, RiverState, RiverMove, RiverConfigLike } from "./scenes/river";
export { areaFor, lengthFor, widthRange, bestWidth, maxArea } from "./scenes/fence";
export type { FenceLike } from "./scenes/fence";
export { countAtStep, formatRule, formatRuleAt, cellKey, bounds, normalizeShape, sameShape, extrapolateCells, patternCentre, colorGroup } from "./scenes/pattern";
export type { Cell, PatternRule } from "./scenes/pattern";
export {
  lazyCaterer,
  countPizzaRegions,
  crossingPoints,
  chordIntersection,
  chordEndpoints,
  distinctChords,
  lineToChord,
  optimalCuts,
  centreCuts,
  pizzaFaces,
  polygonArea,
} from "./scenes/pizza";
export type { Chord, Point } from "./scenes/pizza";
export {
  weighableSet,
  contiguousReach,
  weighingFor,
  balancedTernary,
  minWeighings,
  placeHeavy,
  weighBalls,
  weighWeights,
  splitThree,
} from "./scenes/balance";
export type { Tilt } from "./scenes/balance";
