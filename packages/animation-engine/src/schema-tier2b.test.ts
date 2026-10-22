import { describe, expect, it } from "vitest";
import type { ZodTypeAny } from "zod";
import {
  CalendarGridSchema,
  CoinPilesSchema,
  CycleTimelineSchema,
  DominoTilingSchema,
  ExpressionBuilderSchema,
  FrogPuzzleSchema,
  GuessGameSchema,
  NEW_SCENE_TYPES,
  PascalTriangleSchema,
  QueensBoardSchema,
  StaircasePathsSchema,
  TilingLabSchema,
  TrainsFlySchema,
  WaterJugsSchema,
  parseSceneConfig,
} from "./schema";
import { MODE_SAMPLES, SAMPLE_SCENE_CONFIGS } from "./samples";

const S = SAMPLE_SCENE_CONFIGS;
const M = MODE_SAMPLES;

const CASES: Array<{ name: string; schema: ZodTypeAny; valid: unknown[]; invalid: unknown[] }> = [
  {
    name: "tiling_lab",
    schema: TilingLabSchema,
    valid: [S.tiling_lab, M.tilingWithOctagon, { type: "tiling_lab" }, { type: "tiling_lab", shapes: ["pentagon"], tilers: [] }, { type: "tiling_lab", shapes: ["octagon", "square"], gridSize: 4 }],
    invalid: [
      { ...S.tiling_lab, tilers: ["triangle", "square", "pentagon", "hexagon"] },
      { ...S.tiling_lab, tilers: ["square", "hexagon"] },
      { type: "tiling_lab", shapes: ["square", "square"] },
      { type: "tiling_lab", shapes: [] },
      { type: "tiling_lab", shapes: ["heptagon"] },
      { type: "tiling_lab", gridSize: 5 },
    ],
  },
  {
    name: "domino_tiling",
    schema: DominoTilingSchema,
    valid: [S.domino_tiling, M.dominoOneOfEach, { type: "domino_tiling" }, { type: "domino_tiling", size: 2, removed: [] , tileable: true }, { type: "domino_tiling", size: 3, removed: [[1, 1]] }],
    invalid: [
      { ...S.domino_tiling, tileable: true },
      { ...M.dominoOneOfEach, tileable: false },
      { type: "domino_tiling", size: 4, removed: [[4, 0]] },
      { type: "domino_tiling", size: 8, removed: [[0, 0], [0, 0]] },
      { type: "domino_tiling", size: 9 },
      { type: "domino_tiling", size: 2, removed: [[0, 0], [0, 1], [1, 0]] },
    ],
  },
  {
    name: "staircase_paths",
    schema: StaircasePathsSchema,
    valid: [S.staircase_paths, M.stairsUpToThree, { type: "staircase_paths" }, { type: "staircase_paths", steps: 6, askN: 40 }, { type: "staircase_paths", steps: 1, askN: 3, ways: 3 }],
    invalid: [
      { ...S.staircase_paths, ways: 55 },
      { ...S.staircase_paths, ways: 1024 },
      { type: "staircase_paths", steps: 7 },
      { type: "staircase_paths", maxHop: 4 },
      { type: "staircase_paths", askN: 0 },
    ],
  },
  {
    name: "pascal_triangle",
    schema: PascalTriangleSchema,
    valid: [S.pascal_triangle, { type: "pascal_triangle" }, { type: "pascal_triangle", rows: 4, prefilled: 5 }, { type: "pascal_triangle", rows: 12, askRow: 0, rowSum: 1 }],
    invalid: [
      { ...S.pascal_triangle, rowSum: 512 },
      { ...S.pascal_triangle, rowSum: 100 },
      { type: "pascal_triangle", rows: 4, prefilled: 6 },
      { type: "pascal_triangle", rows: 6, askRow: 8 },
      { type: "pascal_triangle", rows: 13 },
    ],
  },
  {
    name: "calendar_grid",
    schema: CalendarGridSchema,
    valid: [S.calendar_grid, M.calendarGeneric, { type: "calendar_grid", year: 2024, month: 2 }, { type: "calendar_grid", centre: 17, sum: 153 }],
    invalid: [
      { ...S.calendar_grid, sum: 136 },
      { type: "calendar_grid", year: 2026 },
      { type: "calendar_grid", year: 2026, month: 11, centre: 21 }, // a Saturday: no column to its right
      { type: "calendar_grid", year: 2026, month: 11, centre: 3 }, // first week: no row above
      { type: "calendar_grid", sum: 153 },
      { type: "calendar_grid", month: 13, year: 2026 },
    ],
  },
  {
    name: "cycle_timeline",
    schema: CycleTimelineSchema,
    valid: [S.cycle_timeline, M.cycleSeventeen, { type: "cycle_timeline" }, { type: "cycle_timeline", a: 12, b: 6, collision: 12, years: 20 }],
    invalid: [
      { ...S.cycle_timeline, collision: 19 },
      { ...S.cycle_timeline, altA: 13 },
      { type: "cycle_timeline", a: 1 },
      { type: "cycle_timeline", years: 201 },
      { type: "cycle_timeline", a: 12.5 },
    ],
  },
  {
    name: "frog_puzzle",
    schema: FrogPuzzleSchema,
    valid: [S.frog_puzzle, { type: "frog_puzzle" }, { type: "frog_puzzle", perSide: 1, minMoves: 3 }, { type: "frog_puzzle", perSide: 4, minMoves: 24 }],
    invalid: [{ ...S.frog_puzzle, minMoves: 9 }, { type: "frog_puzzle", perSide: 0 }, { type: "frog_puzzle", perSide: 5 }, { type: "frog_puzzle", perSide: 4, minMoves: 15 }],
  },
  {
    name: "water_jugs",
    schema: WaterJugsSchema,
    valid: [S.water_jugs, { type: "water_jugs" }, { type: "water_jugs", jugs: [3, 5], target: 1 }, { type: "water_jugs", jugs: [7, 11], target: 6 }],
    invalid: [
      { ...S.water_jugs, minSteps: 5 },
      { type: "water_jugs", jugs: [4, 6], target: 5 },
      { type: "water_jugs", jugs: [3, 5], target: 6 },
      { type: "water_jugs", jugs: [5, 5], target: 5 },
      { type: "water_jugs", jugs: [3] },
    ],
  },
  {
    name: "queens_board",
    schema: QueensBoardSchema,
    valid: [S.queens_board, M.queensEight, { type: "queens_board" }, { type: "queens_board", n: 5, solutions: 10 }, { type: "queens_board", n: 4, dedupeMirrors: true, solutions: 1 }],
    invalid: [{ ...S.queens_board, solutions: 1 }, { type: "queens_board", n: 3 }, { type: "queens_board", n: 9 }, { type: "queens_board", n: 8, solutions: 12 }],
  },
  {
    name: "guess_game",
    schema: GuessGameSchema,
    valid: [S.guess_game, M.guessComputer, { type: "guess_game" }, { type: "guess_game", max: 1000, minGuesses: 10 }],
    invalid: [{ ...S.guess_game, minGuesses: 50 }, { type: "guess_game", max: 9 }, { type: "guess_game", max: 1001 }, { type: "guess_game", mode: "both" }],
  },
  {
    name: "expression_builder",
    schema: ExpressionBuilderSchema,
    valid: [
      S.expression_builder,
      { type: "expression_builder", allowedNumbers: [1, 3, 4, 6], target: 24, allowedOps: ["+", "-", "*", "/"], solutions: ["6/(1-3/4)"] },
      { type: "expression_builder", allowedNumbers: [10, 2], target: 5, allowedOps: ["/"] },
      { type: "expression_builder", allowedNumbers: [4, 4, 4, 4], target: 10, allowedOps: ["-", "/", "concat"], solutions: ["(44 − 4) ÷ 4"] },
    ],
    invalid: [
      { ...S.expression_builder, solutions: ["4+4-4"] }, // three 4s
      { ...S.expression_builder, solutions: ["4^4-4-4"] }, // ^ not allowed
      { ...S.expression_builder, solutions: ["eval(4)"] },
      { type: "expression_builder", allowedNumbers: [10, 2], target: 5, allowedOps: ["/", "concat"] },
      { type: "expression_builder", allowedNumbers: [4, 4, 4, 4], target: 7, allowedOps: [] },
      { type: "expression_builder", allowedNumbers: [4, 4, 4, 4], target: 7, allowedOps: ["+", "+"] },
      { type: "expression_builder", allowedNumbers: [4, 4, 4, 4], target: 7, allowedOps: ["%"] },
    ],
  },
  {
    name: "coin_piles",
    schema: CoinPilesSchema,
    valid: [S.coin_piles, { type: "coin_piles" }, { type: "coin_piles", coins: 100, heads: 20 }, { type: "coin_piles", coins: 10, heads: 5 }],
    invalid: [{ type: "coin_piles", coins: 10, heads: 6 }, { type: "coin_piles", coins: 5 }, { type: "coin_piles", heads: 0 }, { type: "coin_piles", seed: 0.5 }],
  },
  {
    name: "trains_fly",
    schema: TrainsFlySchema,
    valid: [S.trains_fly, { type: "trains_fly" }, { type: "trains_fly", distanceKm: 200, trainSpeed: 40, flySpeed: 100, flyKm: 250 }],
    invalid: [{ ...S.trains_fly, flyKm: 100 }, { type: "trains_fly", flySpeed: 50 }, { type: "trains_fly", distanceKm: 5 }, { type: "trains_fly", trainSpeed: 0 }],
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

describe("tier-2 batch 3b", () => {
  it("lists the thirteen new types", () => {
    for (const t of CASES.map((c) => c.name)) expect(NEW_SCENE_TYPES as readonly string[]).toContain(t);
    expect(CASES).toHaveLength(13);
  });
  it("every extension sample parses", () => {
    for (const [k, v] of Object.entries(MODE_SAMPLES)) expect(parseSceneConfig(v).ok, k).toBe(true);
  });
  it("fills defaults", () => {
    const j = parseSceneConfig({ type: "water_jugs" });
    expect(j.ok && j.config.type === "water_jugs" && [j.config.jugs, j.config.target]).toEqual([[3, 5], 4]);
    const q = parseSceneConfig({ type: "queens_board" });
    expect(q.ok && q.config.type === "queens_board" && [q.config.n, q.config.countSolutions, q.config.dedupeMirrors]).toEqual([4, true, false]);
    const t = parseSceneConfig({ type: "trains_fly" });
    expect(t.ok && t.config.type === "trains_fly" && [t.config.distanceKm, t.config.trainSpeed, t.config.flySpeed]).toEqual([100, 50, 75]);
    const d = parseSceneConfig({ type: "domino_tiling" });
    expect(d.ok && d.config.type === "domino_tiling" && [d.config.size, d.config.removed]).toEqual([8, []]);
  });
  it("explains wrong answers", () => {
    expect(parseSceneConfig({ ...S.staircase_paths, ways: 55 })).toEqual({ ok: false, error: "ways: 10 stairs with hops up to 2 have 89 ways, not 55" });
    expect(parseSceneConfig({ ...S.domino_tiling, tileable: true })).toEqual({ ok: false, error: "tileable: tileable is true but the board can't be tiled" });
    expect(parseSceneConfig({ type: "water_jugs", jugs: [4, 6], target: 5 })).toMatchObject({ ok: false, error: expect.stringContaining("can't be measured") });
  });
});
