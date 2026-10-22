import type { SceneConfigInput, SceneConfigType } from "./schema";
import { WOLF_GOAT_CABBAGE } from "./scenes/river";

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

/** Extra samples for the other modes of multi-mode scenes (C6, C8, C9, E10, F8). */
export const MODE_SAMPLES = {
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
