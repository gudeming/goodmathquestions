import { describe, expect, it } from "vitest";
import type { ZodTypeAny } from "zod";
import {
  BalanceLabSchema,
  BirthdayRoomSchema,
  ChessboardDoublingSchema,
  DiceLabSchema,
  FenceShaperSchema,
  FoldPaperSchema,
  IllustrationSchema,
  PizzaCutsSchema,
  RiverCrossingSchema,
  SCENE_TYPES,
  TowerOfHanoiSchema,
  VisualPatternSchema,
  parseSceneConfig,
} from "./schema";
import { MODE_SAMPLES, SAMPLE_SCENE_CONFIGS } from "./samples";
import { WOLF_GOAT_CABBAGE } from "./scenes/river";

const bi = (en: string) => ({ en, zh: en });
const plus = (n: number) => {
  const cells: Array<[number, number]> = [[0, 0]];
  for (let k = 1; k <= n; k++) cells.push([k, 0], [-k, 0], [0, k], [0, -k]);
  return { cells };
};

/** Each schema gets >= 3 valid and >= 3 invalid configs; the union must agree with the per-scene schema. */
const CASES: Array<{ name: string; schema: ZodTypeAny; valid: unknown[]; invalid: unknown[] }> = [
  {
    name: "chessboard_doubling",
    schema: ChessboardDoublingSchema,
    valid: [
      { type: "chessboard_doubling", squares: 64, unitLabel: bi("grains") },
      { type: "chessboard_doubling", squares: 8, unitLabel: bi("coins"), startAmount: 3, showLogScale: false },
      { type: "chessboard_doubling", squares: 64, unitLabel: bi("grains"), askSquare: 21 },
    ],
    invalid: [
      { type: "chessboard_doubling", squares: 7, unitLabel: bi("grains") },
      { type: "chessboard_doubling", squares: 64 },
      { type: "chessboard_doubling", squares: 16, unitLabel: bi("grains"), askSquare: 21 },
      { type: "chessboard_doubling", squares: 64, unitLabel: bi("grains"), startAmount: 0 },
    ],
  },
  {
    name: "fold_paper",
    schema: FoldPaperSchema,
    valid: [
      { type: "fold_paper", references: [{ heightMm: 100, label: bi("book") }] },
      { type: "fold_paper", thicknessMm: 0.05, maxFolds: 10, references: [{ heightMm: 50, label: bi("coin") }] },
      SAMPLE_SCENE_CONFIGS.fold_paper,
    ],
    invalid: [
      { type: "fold_paper", references: [] },
      { type: "fold_paper", maxFolds: 9, references: [{ heightMm: 1, label: bi("coin") }] },
      { type: "fold_paper", maxFolds: 10, references: [{ heightMm: 384_400_000_000, label: bi("Moon") }] }, // unreachable
      { type: "fold_paper", thicknessMm: -1, references: [{ heightMm: 1, label: bi("coin") }] },
    ],
  },
  {
    name: "dice_lab",
    schema: DiceLabSchema,
    valid: [SAMPLE_SCENE_CONFIGS.dice_lab, MODE_SAMPLES.diceProduct, MODE_SAMPLES.diceUntilSix, { type: "dice_lab", mode: "sum", dice: 3 }],
    invalid: [
      { type: "dice_lab", mode: "until_target", dice: 1 }, // no target
      { type: "dice_lab", mode: "sum", dice: 4 },
      { type: "dice_lab", mode: "product", dice: 1 },
      { type: "dice_lab", mode: "sum", dice: 2, target: 6 },
      { type: "dice_lab", mode: "until_target", dice: 1, target: 7 },
    ],
  },
  {
    name: "birthday_room",
    schema: BirthdayRoomSchema,
    valid: [SAMPLE_SCENE_CONFIGS.birthday_room, MODE_SAMPLES.birthdayMatchMe, { type: "birthday_room", mode: "any_pair" }],
    invalid: [
      { type: "birthday_room", mode: "any_pair", maxPeople: 20 }, // 50% point (23) not on the slider
      { type: "birthday_room", mode: "match_me", maxPeople: 200 }, // needs >= 253
      { type: "birthday_room", mode: "any_pair", maxPeople: 500 },
      { type: "birthday_room", mode: "both" },
    ],
  },
  {
    name: "tower_of_hanoi",
    schema: TowerOfHanoiSchema,
    valid: [{ type: "tower_of_hanoi", discs: 3 }, { type: "tower_of_hanoi", discs: 3, askDiscs: 4 }, { type: "tower_of_hanoi", discs: 6, askDiscs: 8 }],
    invalid: [{ type: "tower_of_hanoi", discs: 2 }, { type: "tower_of_hanoi", discs: 7 }, { type: "tower_of_hanoi", discs: 3, askDiscs: 9 }],
  },
  {
    name: "river_crossing",
    schema: RiverCrossingSchema,
    valid: [
      SAMPLE_SCENE_CONFIGS.river_crossing,
      { type: "river_crossing", ...WOLF_GOAT_CABBAGE, conflicts: [] },
      {
        type: "river_crossing",
        items: [...WOLF_GOAT_CABBAGE.items, { id: "bug", emoji: "🐛", label: bi("bug") }],
        conflicts: [...WOLF_GOAT_CABBAGE.conflicts, ["bug", "cabbage"]],
        boatCapacity: 2,
      },
    ],
    invalid: [
      { type: "river_crossing", ...WOLF_GOAT_CABBAGE, conflicts: [...WOLF_GOAT_CABBAGE.conflicts, ["wolf", "cabbage"]] }, // unsolvable
      { type: "river_crossing", ...WOLF_GOAT_CABBAGE, conflicts: [["wolf", "lion"]] },
      { type: "river_crossing", ...WOLF_GOAT_CABBAGE, items: [WOLF_GOAT_CABBAGE.items[0], WOLF_GOAT_CABBAGE.items[0]] },
      { type: "river_crossing", ...WOLF_GOAT_CABBAGE, conflicts: [["goat", "goat"]] },
    ],
  },
  {
    name: "fence_shaper",
    schema: FenceShaperSchema,
    valid: [SAMPLE_SCENE_CONFIGS.fence_shaper, { type: "fence_shaper", perimeter: 24, wallSide: true }, { type: "fence_shaper", perimeter: 200, integerOnly: false }],
    invalid: [{ type: "fence_shaper", perimeter: 25 }, { type: "fence_shaper", perimeter: 6 }, { type: "fence_shaper", perimeter: 202 }],
  },
  {
    name: "visual_pattern",
    schema: VisualPatternSchema,
    valid: [
      SAMPLE_SCENE_CONFIGS.visual_pattern,
      { type: "visual_pattern", steps: [plus(1), plus(2), plus(3), plus(4)], rule: { kind: "linear", a: 4, b: 1 }, askStep: 30, colorRule: "ring" },
      {
        type: "visual_pattern",
        steps: [1, 2, 3].map((n) => ({ cells: Array.from({ length: n * n }, (_, i) => [i % n, Math.floor(i / n)]) })),
        rule: { kind: "quadratic", a: 1, b: 0, c: 0 },
        askStep: 10,
      },
    ],
    invalid: [
      { type: "visual_pattern", steps: [plus(1), plus(2), plus(3)], rule: { kind: "linear", a: 5, b: 0 }, askStep: 10 }, // counts disagree
      { type: "visual_pattern", steps: [plus(1), plus(2)], rule: { kind: "linear", a: 4, b: 1 }, askStep: 10 }, // only two steps
      { type: "visual_pattern", steps: [plus(1), plus(2), plus(3)], rule: { kind: "linear", a: 4, b: 1 }, askStep: 3 },
      { type: "visual_pattern", steps: [plus(1), plus(2), { cells: [...plus(3).cells.slice(0, 12), [0, 0]] }], rule: { kind: "linear", a: 4, b: 1 }, askStep: 10 }, // duplicate cell
    ],
  },
  {
    name: "pizza_cuts",
    schema: PizzaCutsSchema,
    valid: [{ type: "pizza_cuts", maxCuts: 2 }, { type: "pizza_cuts", maxCuts: 4 }, { type: "pizza_cuts", maxCuts: 6 }],
    invalid: [{ type: "pizza_cuts", maxCuts: 1 }, { type: "pizza_cuts", maxCuts: 7 }, { type: "pizza_cuts" }],
  },
  {
    name: "balance_lab",
    schema: BalanceLabSchema,
    valid: [SAMPLE_SCENE_CONFIGS.balance_lab, MODE_SAMPLES.balanceWeights, { type: "balance_lab", mode: "find_heavy", items: 27, seed: 1 }, { type: "balance_lab", mode: "weights", weights: [1, 2, 4, 8] }],
    invalid: [
      { type: "balance_lab", mode: "find_heavy" },
      { type: "balance_lab", mode: "weights" },
      { type: "balance_lab", mode: "weights", weights: [1, 3, 9, 27], target: 41 },
      { type: "balance_lab", mode: "find_heavy", items: 2 },
      { type: "balance_lab", mode: "find_heavy", items: 9, weights: [1] },
    ],
  },
  {
    name: "illustration",
    schema: IllustrationSchema,
    valid: [SAMPLE_SCENE_CONFIGS.illustration, MODE_SAMPLES.knightsAndKnaves, { type: "illustration", asset: "a1", caption: bi("x"), revealAsset: "a1-reveal", revealCaption: bi("y") }],
    invalid: [
      { type: "illustration", asset: "../secret", caption: bi("x") },
      { type: "illustration", asset: "Three_Switches", caption: bi("x") },
      { type: "illustration", asset: "three-switches.svg", caption: bi("x") },
      { type: "illustration", asset: "three-switches" },
    ],
  },
];

for (const { name, schema, valid, invalid } of CASES) {
  describe(`${name} schema`, () => {
    it.each(valid)("accepts %j", (c) => {
      expect(schema.safeParse(c).success).toBe(true);
      expect(parseSceneConfig(c).ok).toBe(true);
    });
    it.each(invalid)("rejects %j", (c) => {
      expect(schema.safeParse(c).success).toBe(false);
      expect(parseSceneConfig(c).ok).toBe(false);
    });
  });
}

describe("tier-1 batch 2 samples", () => {
  it("every scene type has a sample that parses", () => {
    for (const t of SCENE_TYPES) expect(parseSceneConfig(SAMPLE_SCENE_CONFIGS[t]).ok, t).toBe(true);
  });
  it.each(Object.entries(MODE_SAMPLES))("mode sample %s parses", (_, c) => expect(parseSceneConfig(c).ok).toBe(true));
  it("fills defaults", () => {
    const r = parseSceneConfig({ type: "fold_paper", references: [{ heightMm: 100, label: bi("book") }] });
    expect(r.ok && r.config.type === "fold_paper" && [r.config.thicknessMm, r.config.maxFolds]).toEqual([0.1, 42]);
    const d = parseSceneConfig({ type: "dice_lab", mode: "sum", dice: 2 });
    expect(d.ok && d.config.type === "dice_lab" && d.config.rolls).toBe(300);
    const f = parseSceneConfig({ type: "fence_shaper", perimeter: 24 });
    expect(f.ok && f.config.type === "fence_shaper" && [f.config.integerOnly, f.config.wallSide]).toEqual([true, false]);
  });
  it("reports why an unsolvable river puzzle is rejected", () => {
    const r = parseSceneConfig({ type: "river_crossing", ...WOLF_GOAT_CABBAGE, conflicts: [...WOLF_GOAT_CABBAGE.conflicts, ["wolf", "cabbage"]] });
    expect(r).toEqual({ ok: false, error: "conflicts: this puzzle has no solution" });
  });
});
