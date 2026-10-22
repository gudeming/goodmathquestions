import type { SceneConfigInput, SceneConfigType } from "./schema";
import { WOLF_GOAT_CABBAGE } from "./scenes/river";
import { KONIGSBERG } from "./scenes/bridges";

/** E3 growing plus: a centre dot and four arms of length n. */
function plusStep(n: number): { cells: Array<[number, number]> } {
  const cells: Array<[number, number]> = [[0, 0]];
  for (let k = 1; k <= n; k++) cells.push([k, 0], [-k, 0], [0, k], [0, -k]);
  return { cells };
}

/**
 * One valid sample config per scene type: used by the admin playground's editor and
 * pinned by tests (every sample must parse). New-scene samples match the hero questions.
 */
export const SAMPLE_SCENE_CONFIGS: Record<SceneConfigType, SceneConfigInput> = {
  gauss_pairing: { type: "gauss_pairing", n: 100, visibleHead: 6, visibleTail: 6, pairSum: 101, pairCount: 50 },
  handshake_graph: { type: "handshake_graph", people: 10 },
  grid_squares: { type: "grid_squares", size: 8 },
  number_trick_stepper: {
    type: "number_trick_stepper",
    input: { digits: 3, constraint: "distinct_ends_diff_ge_2" },
    steps: [
      { op: "abs_diff_reverse", label: { en: "Reverse it. Subtract the smaller from the bigger.", zh: "倒过来写，大数减小数。" } },
      { op: "add_reverse", label: { en: "Reverse the result and add the two.", zh: "把结果倒过来写，两数相加。" } },
    ],
    expectFixedPoint: 1089,
    revealExtra: "nines_table",
  },
  monty_hall: { type: "monty_hall", doors: 3, rounds: 20, seed: 7 },
  chessboard_doubling: { type: "chessboard_doubling", squares: 64, unitLabel: { en: "grains of rice", zh: "粒米" }, startAmount: 1, showLogScale: true, askSquare: 21 },
  fold_paper: {
    type: "fold_paper",
    thicknessMm: 0.1,
    maxFolds: 42,
    references: [
      { heightMm: 2, emoji: "🪙", label: { en: "a coin", zh: "一枚硬币" } },
      { heightMm: 100, emoji: "📕", label: { en: "a thick book", zh: "一本厚书" } },
      { heightMm: 1_700, emoji: "🧍", label: { en: "a person", zh: "一个人" } },
      { heightMm: 100_000, emoji: "🏢", label: { en: "a skyscraper", zh: "一座摩天楼" } },
      { heightMm: 8_849_000, emoji: "🏔️", label: { en: "Mount Everest", zh: "珠穆朗玛峰" } },
      { heightMm: 384_400_000_000, emoji: "🌕", label: { en: "the Moon", zh: "月球" } },
    ],
  },
  dice_lab: { type: "dice_lab", mode: "sum", dice: 2, rolls: 300, seed: 3 },
  birthday_room: { type: "birthday_room", mode: "any_pair", maxPeople: 60, trials: 200, seed: 23 },
  tower_of_hanoi: { type: "tower_of_hanoi", discs: 3, askDiscs: 4 },
  river_crossing: { type: "river_crossing", ...WOLF_GOAT_CABBAGE },
  fence_shaper: { type: "fence_shaper", perimeter: 24, integerOnly: true, wallSide: false },
  visual_pattern: {
    type: "visual_pattern",
    steps: [plusStep(1), plusStep(2), plusStep(3)],
    rule: { kind: "linear", a: 4, b: 1 },
    askStep: 10,
    colorRule: "arm",
  },
  pizza_cuts: { type: "pizza_cuts", maxCuts: 4 },
  balance_lab: { type: "balance_lab", mode: "find_heavy", items: 9, seed: 5 },
  illustration: {
    type: "illustration",
    asset: "three-switches",
    caption: { en: "Three switches downstairs, one bulb upstairs. You may go up only once.", zh: "楼下三个开关，楼上一盏灯。你只能上楼一次。" },
  },
  scale_ladder: {
    type: "scale_ladder",
    mode: "time",
    start: 1_000_000,
    references: [
      { value: 23_400, emoji: "🏫", label: { en: "a school day", zh: "一天的课" } },
      { value: 604_800, emoji: "📅", label: { en: "a week", zh: "一周" } },
      { value: 4_838_400, emoji: "🏖️", label: { en: "a summer holiday", zh: "一个暑假" } },
    ],
  },
  halving_bar: { type: "halving_bar", ratio: 0.5, maxSteps: 20 },
  circle_rope: { type: "circle_rope", extraMetersMax: 12 },
  pythagoras_squares: { type: "pythagoras_squares", a: 6, b: 8, lockRightAngle: true },
  bridges_trace: { type: "bridges_trace", ...KONIGSBERG, layout: "konigsberg", solvable: false },
  clock_overlap: { type: "clock_overlap", hours: 24, overlaps: 22 },
  coin_flips: { type: "coin_flips", streak: 10, seed: 1024 },
  sock_drawer: { type: "sock_drawer", colors: 3, seed: 4 },
  pi_darts: { type: "pi_darts", maxDrops: 5000, seed: 314 },
  collatz_path: { type: "collatz_path", maxStart: 200, highlightRange: [1, 9] },
  digit_slide: { type: "digit_slide", multiplier: 11, examples: [45, 63, 72, 85] },
  fib_spiral: { type: "fib_spiral", terms: 10 },
  divisor_blocks: { type: "divisor_blocks", max: 40, highlight: [6, 28] },
  tiling_lab: { type: "tiling_lab", shapes: ["triangle", "square", "pentagon", "hexagon"], gridSize: 2, tilers: ["triangle", "square", "hexagon"] },
  domino_tiling: { type: "domino_tiling", size: 8, removed: [[0, 0], [7, 7]], tileable: false },
  staircase_paths: { type: "staircase_paths", steps: 4, maxHop: 2, askN: 10, ways: 89 },
  pascal_triangle: { type: "pascal_triangle", rows: 10, prefilled: 3, askRow: 10, rowSum: 1024 },
  calendar_grid: { type: "calendar_grid", year: 2026, month: 11, centre: 17, sum: 153 },
  cycle_timeline: { type: "cycle_timeline", a: 13, b: 6, years: 120, altA: 12, collision: 78 },
  frog_puzzle: { type: "frog_puzzle", perSide: 3, minMoves: 15 },
  water_jugs: { type: "water_jugs", jugs: [3, 5], target: 4, minSteps: 6 },
  queens_board: { type: "queens_board", n: 4, countSolutions: true, solutions: 2 },
  guess_game: { type: "guess_game", max: 100, mode: "you_guess", seed: 42, minGuesses: 7 },
  expression_builder: {
    type: "expression_builder",
    allowedNumbers: [4, 4, 4, 4],
    target: 7,
    allowedOps: ["+", "-", "*", "/", "sqrt", "!", "concat"],
    solutions: ["44/4-4", "4+4-4/4", "4!/4+4/4"],
  },
  coin_piles: { type: "coin_piles", coins: 100, heads: 10, seed: 10 },
  trains_fly: { type: "trains_fly", distanceKm: 100, trainSpeed: 50, flySpeed: 75, flyKm: 75 },
  pizza_slice: { type: "pizza_slice", totalSlices: 8, eatenSlices: 3 },
  balance_scale: { type: "balance_scale", leftSide: { expression: "x + 9" }, rightSide: { value: 27 } },
  number_journey: { type: "number_journey", range: [0, 25], highlights: [21] },
  triangle_angles: { type: "triangle_angles", angles: [37, 53, 90] },
  staircase: { type: "staircase", totalStairs: 5, stepOptions: [1, 2] },
  candy_jar: { type: "candy_jar", red: 9, blue: 15, green: 0 },
  magic_square: { type: "magic_square", size: 3, targetSum: 15, known: { "0,0": 2, "1,1": 5 } },
  number_combine: { type: "number_combine", numbers: [12, 5, 12, 5], operation: "add" },
};

/** Extra hero-question samples for the other number tricks (D2-D4). */
export const TRICK_SAMPLES = {
  mindReadingFive: {
    type: "number_trick_stepper",
    input: { min: 1, max: 100 },
    steps: [
      { op: "double", label: { en: "Double it.", zh: "乘 2。" } },
      { op: "add", arg: 10, label: { en: "Add 10.", zh: "加 10。" } },
      { op: "halve", label: { en: "Halve it.", zh: "除以 2。" } },
      { op: "subtract_original", label: { en: "Take away the number you started with.", zh: "减去你最开始想的数。" } },
    ],
    expectFixedPoint: 5,
  },
  scrambleNine: {
    type: "number_trick_stepper",
    input: { digits: 4, constraint: "not_all_same" },
    steps: [{ op: "scramble_minus", label: { en: "Scramble the digits. Subtract the smaller from the bigger.", zh: "打乱数字顺序，大数减小数。" } }],
    expectDivisibleBy: 9,
  },
  kaprekar: {
    type: "number_trick_stepper",
    input: { digits: 4, constraint: "not_all_same" },
    steps: [{ op: "sort_desc_minus_asc", label: { en: "Biggest order minus smallest order.", zh: "从大到小排减去从小到大排。" } }],
    loopUntilFixed: true,
    maxLoops: 7,
    expectFixedPoint: 6174,
  },
} satisfies Record<string, SceneConfigInput>;

/** Extra samples for the other modes of multi-mode scenes (C6, C8, C9, E10, F8, A5, A9) and extensions. */
export const MODE_SAMPLES = {
  scaleHeartbeats: {
    type: "scale_ladder",
    mode: "heartbeats",
    start: 70,
    target: 1_000_000_000,
    references: [
      { value: 6, emoji: "🎒", label: { en: "starting school", zh: "上小学" } },
      { value: 18, emoji: "🎓", label: { en: "finishing school", zh: "高中毕业" } },
      { value: 40, emoji: "🧑", label: { en: "a parent", zh: "爸爸妈妈" } },
    ],
  },
  scalePowers: {
    type: "scale_ladder",
    mode: "powers",
    start: 80,
    target: 100,
    labels: { start: { en: "atoms in the universe", zh: "宇宙里的原子" }, target: { en: "a googol", zh: "古戈尔" } },
    references: [
      { value: 18, emoji: "🏖️", label: { en: "grains of sand on Earth", zh: "地球上的沙粒" } },
      { value: 22, emoji: "✨", label: { en: "stars in the universe", zh: "宇宙里的恒星" } },
    ],
  },
  halvingThirds: { type: "halving_bar", ratio: 1 / 3, maxSteps: 20 },
  bridgesOneRemoved: { type: "bridges_trace", ...KONIGSBERG, edges: KONIGSBERG.edges.slice(1), layout: "konigsberg", solvable: true },
  socksTwoPairs: { type: "sock_drawer", colors: 3, guaranteeTwoPairs: true, seed: 6 },
  tilingWithOctagon: { type: "tiling_lab", shapes: ["triangle", "square", "pentagon", "hexagon", "octagon"], tilers: ["triangle", "square", "hexagon"] },
  dominoOneOfEach: { type: "domino_tiling", size: 8, removed: [[0, 0], [0, 7]], tileable: true },
  stairsUpToThree: { type: "staircase_paths", steps: 4, maxHop: 3, askN: 10, ways: 274 },
  calendarGeneric: { type: "calendar_grid" },
  cycleSeventeen: { type: "cycle_timeline", a: 17, b: 6, years: 120, altA: 12, collision: 102 },
  queensEight: { type: "queens_board", n: 8, countSolutions: true, solutions: 92 },
  guessComputer: { type: "guess_game", max: 100, mode: "computer_guesses", minGuesses: 7 },
  diceProduct: { type: "dice_lab", mode: "product", dice: 2, rolls: 300, seed: 6 },
  diceUntilSix: { type: "dice_lab", mode: "until_target", dice: 1, target: 6, rolls: 300, seed: 8 },
  birthdayMatchMe: { type: "birthday_room", mode: "match_me", maxPeople: 500, trials: 200, seed: 253 },
  balanceWeights: { type: "balance_lab", mode: "weights", weights: [1, 3, 9, 27], target: 5 },
  knightsAndKnaves: {
    type: "illustration",
    asset: "knights-and-knaves",
    caption: { en: "A says: \u201cWe are both knaves.\u201d", zh: "A 说：「我们两个都是骗子。」" },
  },
} satisfies Record<string, SceneConfigInput>;
