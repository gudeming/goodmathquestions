import { describe, expect, it } from "vitest";
import type { ZodTypeAny } from "zod";
import {
  BridgesTraceSchema,
  CircleRopeSchema,
  ClockOverlapSchema,
  CoinFlipsSchema,
  CollatzPathSchema,
  DigitSlideSchema,
  DivisorBlocksSchema,
  FibSpiralSchema,
  HalvingBarSchema,
  PiDartsSchema,
  PythagorasSquaresSchema,
  ScaleLadderSchema,
  SockDrawerSchema,
  NEW_SCENE_TYPES,
  parseSceneConfig,
} from "./schema";
import { MODE_SAMPLES, SAMPLE_SCENE_CONFIGS } from "./samples";
import { KONIGSBERG } from "./scenes/bridges";

const bi = (en: string) => ({ en, zh: en });
const S = SAMPLE_SCENE_CONFIGS;

const CASES: Array<{ name: string; schema: ZodTypeAny; valid: unknown[]; invalid: unknown[] }> = [
  {
    name: "scale_ladder",
    schema: ScaleLadderSchema,
    valid: [S.scale_ladder, MODE_SAMPLES.scaleHeartbeats, MODE_SAMPLES.scalePowers, { type: "scale_ladder", mode: "time", start: 1_000_000_000 }, { type: "scale_ladder", mode: "powers" }],
    invalid: [
      { type: "scale_ladder", mode: "time", target: 5 },
      { type: "scale_ladder", mode: "heartbeats", start: 5000 },
      { type: "scale_ladder", mode: "powers", start: 100, target: 100 },
      { type: "scale_ladder", mode: "powers", start: 80.5 },
      { type: "scale_ladder", mode: "speed" },
    ],
  },
  {
    name: "halving_bar",
    schema: HalvingBarSchema,
    valid: [S.halving_bar, MODE_SAMPLES.halvingThirds, { type: "halving_bar" }, { type: "halving_bar", ratio: 0.3333333, maxSteps: 60 }],
    invalid: [{ type: "halving_bar", ratio: 0.25 }, { type: "halving_bar", maxSteps: 4 }, { type: "halving_bar", maxSteps: 61 }, { type: "halving_bar", ratio: "1/2" }],
  },
  {
    name: "circle_rope",
    schema: CircleRopeSchema,
    valid: [S.circle_rope, { type: "circle_rope" }, { type: "circle_rope", extraMetersMax: 1, planets: [{ id: "moon", label: bi("Moon"), radiusM: 1_737_400, emoji: "🌕" }] }],
    invalid: [
      { type: "circle_rope", extraMetersMax: 0.5 },
      { type: "circle_rope", planets: [] },
      { type: "circle_rope", planets: [{ id: "x", label: bi("x"), radiusM: 1 }, { id: "x", label: bi("y"), radiusM: 2 }] },
      { type: "circle_rope", planets: [{ id: "Earth", label: bi("x"), radiusM: 1 }] },
    ],
  },
  {
    name: "pythagoras_squares",
    schema: PythagorasSquaresSchema,
    valid: [S.pythagoras_squares, { type: "pythagoras_squares" }, { type: "pythagoras_squares", a: 5, b: 12, lockRightAngle: false }, { type: "pythagoras_squares", a: 3, b: 4 }],
    invalid: [{ type: "pythagoras_squares", a: 6, b: 7 }, { type: "pythagoras_squares", a: 0, b: 8 }, { type: "pythagoras_squares", a: 15, b: 20 }, { type: "pythagoras_squares", a: 6.5 }],
  },
  {
    name: "bridges_trace",
    schema: BridgesTraceSchema,
    valid: [S.bridges_trace, MODE_SAMPLES.bridgesOneRemoved, { type: "bridges_trace", nodes: [{ id: "a", x: 10, y: 10 }, { id: "b", x: 90, y: 90 }], edges: [["a", "b"]] }],
    invalid: [
      { ...S.bridges_trace, solvable: true }, // Königsberg is not walkable
      { ...MODE_SAMPLES.bridgesOneRemoved, solvable: false },
      { type: "bridges_trace", nodes: KONIGSBERG.nodes, edges: [...KONIGSBERG.edges, ["north", "nowhere"]] },
      { type: "bridges_trace", nodes: KONIGSBERG.nodes, edges: [["north", "north"]] },
      { type: "bridges_trace", nodes: [...KONIGSBERG.nodes, { id: "lonely", x: 5, y: 5 }], edges: KONIGSBERG.edges },
      { type: "bridges_trace", nodes: ["a", "b", "c", "d"].map((id, i) => ({ id, x: i * 10, y: 0 })), edges: [["a", "b"], ["c", "d"]] }, // two pieces
      { type: "bridges_trace", nodes: [{ id: "a", x: 0, y: 0 }, { id: "a", x: 9, y: 9 }], edges: [["a", "a"]] },
    ],
  },
  {
    name: "clock_overlap",
    schema: ClockOverlapSchema,
    valid: [S.clock_overlap, { type: "clock_overlap" }, { type: "clock_overlap", hours: 12, overlaps: 11 }],
    invalid: [{ type: "clock_overlap", overlaps: 24 }, { type: "clock_overlap", hours: 12, overlaps: 12 }, { type: "clock_overlap", hours: 6 }],
  },
  {
    name: "coin_flips",
    schema: CoinFlipsSchema,
    valid: [S.coin_flips, { type: "coin_flips" }, { type: "coin_flips", streak: 3 }],
    invalid: [{ type: "coin_flips", streak: 1 }, { type: "coin_flips", streak: 13 }, { type: "coin_flips", seed: 1.5 }],
  },
  {
    name: "sock_drawer",
    schema: SockDrawerSchema,
    valid: [S.sock_drawer, MODE_SAMPLES.socksTwoPairs, { type: "sock_drawer", colors: 5 }],
    invalid: [{ type: "sock_drawer", colors: 2 }, { type: "sock_drawer", colors: 6 }, { type: "sock_drawer", guaranteeTwoPairs: "yes" }],
  },
  {
    name: "pi_darts",
    schema: PiDartsSchema,
    valid: [S.pi_darts, { type: "pi_darts" }, { type: "pi_darts", maxDrops: 20_000, seed: 1 }],
    invalid: [{ type: "pi_darts", maxDrops: 50 }, { type: "pi_darts", maxDrops: 20_001 }, { type: "pi_darts", maxDrops: 1000.5 }],
  },
  {
    name: "collatz_path",
    schema: CollatzPathSchema,
    valid: [S.collatz_path, { type: "collatz_path" }, { type: "collatz_path", maxStart: 1000, highlightRange: [20, 30] }],
    invalid: [
      { type: "collatz_path", highlightRange: [9, 1] },
      { type: "collatz_path", maxStart: 10, highlightRange: [1, 20] },
      { type: "collatz_path", highlightRange: [1, 40] },
      { type: "collatz_path", maxStart: 5 },
    ],
  },
  {
    name: "digit_slide",
    schema: DigitSlideSchema,
    valid: [S.digit_slide, { type: "digit_slide" }, { type: "digit_slide", multiplier: 11, examples: [99] }],
    invalid: [{ type: "digit_slide", multiplier: 12 }, { type: "digit_slide", examples: [100] }, { type: "digit_slide", examples: [45, 45] }, { type: "digit_slide", examples: [] }],
  },
  {
    name: "fib_spiral",
    schema: FibSpiralSchema,
    valid: [S.fib_spiral, { type: "fib_spiral" }, { type: "fib_spiral", terms: 14 }],
    invalid: [{ type: "fib_spiral", terms: 4 }, { type: "fib_spiral", terms: 15 }, { type: "fib_spiral", terms: 9.5 }],
  },
  {
    name: "divisor_blocks",
    schema: DivisorBlocksSchema,
    valid: [S.divisor_blocks, { type: "divisor_blocks" }, { type: "divisor_blocks", max: 10, highlight: [6] }],
    invalid: [
      { type: "divisor_blocks", max: 20 }, // default highlight 28 is beyond max
      { type: "divisor_blocks", highlight: [6, 24] }, // 24 is abundant
      { type: "divisor_blocks", highlight: [6, 6] },
      { type: "divisor_blocks", max: 101 },
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

describe("tier-2 batch 3a", () => {
  it("lists the thirteen new types", () => {
    for (const t of ["scale_ladder", "halving_bar", "circle_rope", "pythagoras_squares", "bridges_trace", "clock_overlap", "coin_flips", "sock_drawer", "pi_darts", "collatz_path", "digit_slide", "fib_spiral", "divisor_blocks"])
      expect(NEW_SCENE_TYPES as readonly string[]).toContain(t);
  });
  it("fills defaults", () => {
    const h = parseSceneConfig({ type: "halving_bar" });
    expect(h.ok && h.config.type === "halving_bar" && [h.config.ratio, h.config.maxSteps]).toEqual([0.5, 20]);
    const p = parseSceneConfig({ type: "pythagoras_squares" });
    expect(p.ok && p.config.type === "pythagoras_squares" && [p.config.a, p.config.b, p.config.lockRightAngle]).toEqual([6, 8, true]);
    const d = parseSceneConfig({ type: "divisor_blocks" });
    expect(d.ok && d.config.type === "divisor_blocks" && [d.config.max, d.config.highlight]).toEqual([40, [6, 28]]);
  });
  it("explains a wrong bridges answer", () => {
    expect(parseSceneConfig({ ...S.bridges_trace, solvable: true })).toEqual({ ok: false, error: "solvable: solvable is true but Euler's rule says false" });
  });
});
