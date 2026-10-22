import type { SceneConfigInput, SceneConfigType } from "./schema";

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
