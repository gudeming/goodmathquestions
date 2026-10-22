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
  ScaleLadderSchema,
  HalvingBarSchema,
  CircleRopeSchema,
  PythagorasSquaresSchema,
  BridgesTraceSchema,
  ClockOverlapSchema,
  CoinFlipsSchema,
  SockDrawerSchema,
  PiDartsSchema,
  CollatzPathSchema,
  DigitSlideSchema,
  FibSpiralSchema,
  DivisorBlocksSchema,
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
  ScaleLadderConfig,
  HalvingBarConfig,
  CircleRopeConfig,
  PythagorasSquaresConfig,
  BridgesTraceConfig,
  ClockOverlapConfig,
  CoinFlipsConfig,
  SockDrawerConfig,
  PiDartsConfig,
  CollatzPathConfig,
  DigitSlideConfig,
  FibSpiralConfig,
  DivisorBlocksConfig,
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

// Tier 2, batch 3a.
export {
  ladderFor,
  applyLadderStep,
  ladderValues,
  answerRung,
  scaleAnswer,
  secondsIn,
  roundForLadder,
  SCALE_DEFAULTS,
  SECONDS_PER_DAY,
  DAYS_PER_YEAR,
  MINUTES_PER_YEAR,
} from "./scenes/scale";
export type { ScaleMode, Ladder, LadderStep } from "./scenes/scale";
export {
  ratioDenominator,
  seriesTerm,
  partialSum,
  partialSumFraction,
  seriesLimit,
  remainingAfter,
  smallerThan,
  stepsToShrinkBelow,
  TINY_THINGS,
  HALVING_DENOMINATORS,
} from "./scenes/halving";
export type { HalvingDenominator, TinyThing } from "./scenes/halving";
export { ropeGap, ropeGapFor, extraForGap, circumference, biggestThatFits, DEFAULT_PLANETS, GAP_THINGS } from "./scenes/circle-rope";
export type { RopePlanet, GapThing } from "./scenes/circle-rope";
export { distance, integerHypotenuse, angleAt, squareOnSide, tileCorners, rightTriangle, triangleSquares, squaresBounds, tileMoves } from "./scenes/pythagoras";
export type { Vec, RightTriangle, TriangleSquares } from "./scenes/pythagoras";
export { degrees, oddDegreeNodes, isEdgeConnected, hasEulerPath, openEdgesAt, otherEnd, eulerPath, isValidEulerWalk, KONIGSBERG } from "./scenes/bridges";
export type { GraphLike } from "./scenes/bridges";
export { overlapTimes, handAngles, handGap, crossedOverlaps, minutesForDrag, formatClock, MINUTES_PER_DAY, LAP_MINUTES } from "./scenes/clock";
export {
  streakProbability,
  expectedFlipsForStreak,
  flip,
  addFlip,
  flipUntilStreak,
  collectAfterStreak,
  EMPTY_COIN_STATE,
  RECENT_FLIPS,
} from "./scenes/coins";
export type { Flip, CoinState } from "./scenes/coins";
export { socksToGuarantee, sockCounts, pairsIn, worstSock, randomSock, worstCaseSequence, SOCK_COLORS } from "./scenes/socks";
export type { SockColor } from "./scenes/socks";
export { isInsideCircle, throwDarts, piEstimate, convergence, simulatePi } from "./scenes/pi-darts";
export type { Dart } from "./scenes/pi-darts";
export {
  collatzPath,
  collatzSteps,
  collatzPeak,
  longestCollatz,
  COLLATZ_CAP,
  timesElevenSteps,
  fibonacci,
  fibRatios,
  fibSquares,
  fibBounds,
  sunflowerSeeds,
  GOLDEN_RATIO,
  properDivisors,
  aliquotSum,
  classify,
  perfectNumbersUpTo,
} from "./scenes/number-play";
export type { ElevenStep, FibSquare, DivisorClass } from "./scenes/number-play";
