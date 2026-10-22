import { describe, expect, it } from "vitest";
import {
  GaussPairingSchema,
  HandshakeGraphSchema,
  GridSquaresSchema,
  NumberTrickStepperSchema,
  MontyHallSchema,
  SceneConfigSchema,
  isLegacySceneType,
  parseSceneConfig,
} from "./schema";
import { SAMPLE_SCENE_CONFIGS, TRICK_SAMPLES } from "./samples";

const bi = (en: string) => ({ en, zh: en });

describe("gauss_pairing schema", () => {
  const valid = [
    { type: "gauss_pairing", n: 100, pairSum: 101, pairCount: 50 },
    { type: "gauss_pairing", n: 10, visibleHead: 3, visibleTail: 3, pairSum: 11, pairCount: 5 },
    { type: "gauss_pairing", n: 1000, visibleHead: 10, visibleTail: 10, pairSum: 1001, pairCount: 500, seed: 3 },
  ];
  const invalid = [
    { type: "gauss_pairing", n: 100, pairSum: 100, pairCount: 50 }, // wrong pair sum
    { type: "gauss_pairing", n: 100, pairSum: 101, pairCount: 100 }, // counted pairs twice
    { type: "gauss_pairing", n: 99, pairSum: 100, pairCount: 49 }, // odd n
    { type: "gauss_pairing", n: 2, pairSum: 3, pairCount: 1 }, // n below range
  ];
  it.each(valid)("accepts %j", (c) => expect(GaussPairingSchema.safeParse(c).success).toBe(true));
  it.each(invalid)("rejects %j", (c) => expect(GaussPairingSchema.safeParse(c).success).toBe(false));
  it("fills visibleHead/visibleTail defaults", () => {
    const r = parseSceneConfig(valid[0]);
    expect(r.ok && r.config.type === "gauss_pairing" && [r.config.visibleHead, r.config.visibleTail]).toEqual([6, 6]);
  });
  it("applies the refinement through the union too", () => {
    const r = parseSceneConfig(invalid[0]);
    expect(r).toEqual({ ok: false, error: "pairSum: pairSum/pairCount inconsistent with n" });
  });
});

describe("handshake_graph schema", () => {
  const valid = [
    { type: "handshake_graph", people: 10 },
    { type: "handshake_graph", people: 3 },
    { type: "handshake_graph", people: 3, names: [bi("Ann"), bi("Bo"), bi("Cy")] },
  ];
  const invalid = [
    { type: "handshake_graph", people: 2 },
    { type: "handshake_graph", people: 13 },
    { type: "handshake_graph", people: 4, names: [bi("Ann"), bi("Bo")] },
    { type: "handshake_graph", people: 4.5 },
  ];
  it.each(valid)("accepts %j", (c) => expect(HandshakeGraphSchema.safeParse(c).success).toBe(true));
  it.each(invalid)("rejects %j", (c) => expect(HandshakeGraphSchema.safeParse(c).success).toBe(false));
  it.each(invalid)("union rejects %j", (c) => expect(parseSceneConfig(c).ok).toBe(false));
});

describe("grid_squares schema", () => {
  it.each([3, 5, 8])("accepts size %i", (size) => expect(GridSquaresSchema.safeParse({ type: "grid_squares", size }).success).toBe(true));
  it.each([2, 9, 4.5])("rejects size %s", (size) => expect(GridSquaresSchema.safeParse({ type: "grid_squares", size }).success).toBe(false));
  it("rejects a missing size", () => expect(parseSceneConfig({ type: "grid_squares" }).ok).toBe(false));
});

describe("monty_hall schema", () => {
  const valid = [
    { type: "monty_hall", doors: 3 },
    { type: "monty_hall", doors: 100, rounds: 5, seed: 1 },
    { type: "monty_hall", doors: 10, rounds: 200 },
  ];
  const invalid = [
    { type: "monty_hall", doors: 2 },
    { type: "monty_hall", doors: 101 },
    { type: "monty_hall", doors: 3, rounds: 0 },
  ];
  it.each(valid)("accepts %j", (c) => expect(MontyHallSchema.safeParse(c).success).toBe(true));
  it.each(invalid)("rejects %j", (c) => expect(MontyHallSchema.safeParse(c).success).toBe(false));
  it("defaults rounds to 20", () => {
    const r = parseSceneConfig({ type: "monty_hall", doors: 3 });
    expect(r.ok && r.config.type === "monty_hall" && r.config.rounds).toBe(20);
  });
});

describe("number_trick_stepper schema", () => {
  const step = (op: string, arg?: number) => ({ op, arg, label: bi(op) });
  const valid = [
    SAMPLE_SCENE_CONFIGS.number_trick_stepper,
    TRICK_SAMPLES.mindReadingFive,
    TRICK_SAMPLES.scrambleNine,
    TRICK_SAMPLES.kaprekar,
  ];
  const invalid = [
    // 1089 without the "ends differ by >= 2" constraint: 2-digit-difference inputs like 121 give 0.
    { type: "number_trick_stepper", input: { digits: 3 }, steps: [step("abs_diff_reverse"), step("add_reverse")], expectFixedPoint: 1089 },
    // "add 20" makes the answer 10, not 5.
    { ...TRICK_SAMPLES.mindReadingFive, steps: [step("double"), step("add", 20), step("halve"), step("subtract_original")] },
    // add without arg
    { type: "number_trick_stepper", input: { min: 1, max: 9 }, steps: [step("add")] },
    // unknown op
    { type: "number_trick_stepper", input: { min: 1, max: 9 }, steps: [step("cube")] },
    // Kaprekar capped at 2 loops cannot settle for every input
    { ...TRICK_SAMPLES.kaprekar, maxLoops: 2 },
    // impossible input range
    { type: "number_trick_stepper", input: { min: 9, max: 1 }, steps: [step("double")] },
    // wrong divisibility claim
    { ...TRICK_SAMPLES.scrambleNine, expectDivisibleBy: 11 },
  ];
  it.each(valid)("accepts sample %#", (c) => expect(NumberTrickStepperSchema.safeParse(c).success).toBe(true));
  it.each(invalid)("rejects case %#", (c) => expect(NumberTrickStepperSchema.safeParse(c).success).toBe(false));
  it("explains a failed fixed-point check", () => {
    const r = parseSceneConfig(invalid[1]);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/^expectFixedPoint: input \d+ ends at 10, expected 5$/);
  });
});

describe("legacy configs", () => {
  // Shapes copied from us-k12-question-bank.ts / seed.ts (authored + inferred).
  const legacy = [
    { type: "number_journey", range: [0, 20], highlights: [] },
    { type: "number_journey", range: [0, 1], highlights: [0.5] },
    { type: "number_journey", range: [-10, 12], highlights: [-4, 7] },
    { type: "number_combine", numbers: [3, 4, 5], operation: "mixed" },
    { type: "number_combine", numbers: [80, -20], operation: "add" },
    { type: "pizza_slice", totalSlices: 20, eatenSlices: 5 },
    { type: "candy_jar", red: 9, blue: 15, green: 0 },
    { type: "balance_scale", leftSide: { expression: "(x-7)×3" }, rightSide: { value: 27 } },
    { type: "triangle_angles", angles: [180, 180, 0] },
    { type: "magic_square", size: 4, targetSum: 24, known: {} },
    { type: "staircase", totalStairs: 4, stepOptions: [1, 2] },
    { type: "balance_scale", leftSide: { expression: "4 coins" }, rightSide: { value: "4 coins" } },
  ];
  it.each(legacy)("parses %j and keeps extra keys", (c) => {
    const r = parseSceneConfig(c);
    expect(r.ok).toBe(true);
    expect(r.ok && r.config).toEqual(c);
  });
  it("identifies legacy types", () => {
    expect(isLegacySceneType("number_journey")).toBe(true);
    expect(isLegacySceneType("gauss_pairing")).toBe(false);
    expect(isLegacySceneType(42)).toBe(false);
  });
});

describe("parseSceneConfig", () => {
  it.each([null, undefined, {}, "gauss_pairing", { type: "no_such_scene" }])("rejects %j without throwing", (c) => {
    const r = parseSceneConfig(c);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.length).toBeGreaterThan(0);
  });
  it("parses every playground sample", () => {
    for (const [type, sample] of Object.entries(SAMPLE_SCENE_CONFIGS)) {
      const r = SceneConfigSchema.safeParse(sample);
      expect(r.success, `${type}: ${r.success ? "" : r.error.message}`).toBe(true);
      expect(r.success && r.data.type).toBe(type);
    }
  });
});
