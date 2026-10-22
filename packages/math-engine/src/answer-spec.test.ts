import { describe, expect, it } from "vitest";
import {
  AnswerSpecSchema,
  ChoicesSchema,
  GuessConfigSchema,
  SolutionTagsSchema,
  WrongAnswerRulesSchema,
  parseMatchRule,
  splitMultiValue,
  splitOrdering,
  validateAnswerV2,
  wrongAnswerFeedbackFor,
  type AnswerSpec,
  type WrongAnswerRule,
} from "./answer-spec";

const fb = (tag: string) => ({ en: `en:${tag}`, zh: `zh:${tag}` });
const rule = (match: string): WrongAnswerRule => ({ match, feedback: fb(match) });

describe("schemas", () => {
  it("accepts the three GuessConfig shapes and rejects bad sliders / duplicate ids", () => {
    expect(GuessConfigSchema.safeParse({ type: "slider", min: 0, max: 100, step: 1 }).success).toBe(true);
    expect(
      GuessConfigSchema.safeParse({
        type: "choice",
        options: [
          { id: "A", en: "a", zh: "甲" },
          { id: "B", en: "b", zh: "乙" },
        ],
      }).success
    ).toBe(true);
    expect(
      GuessConfigSchema.safeParse({ type: "compare", left: fb("l"), right: fb("r") }).success
    ).toBe(true);

    expect(GuessConfigSchema.safeParse({ type: "slider", min: 5, max: 5, step: 1 }).success).toBe(false);
    expect(GuessConfigSchema.safeParse({ type: "slider", min: 0, max: 9, step: 0 }).success).toBe(false);
    expect(
      GuessConfigSchema.safeParse({ type: "slider", min: 0, max: 9, step: 1, logScale: true }).success
    ).toBe(false);
    expect(
      GuessConfigSchema.safeParse({
        type: "choice",
        options: [
          { id: "A", en: "a", zh: "甲" },
          { id: "A", en: "b", zh: "乙" },
        ],
      }).success
    ).toBe(false);
    expect(GuessConfigSchema.safeParse({ type: "dial" }).success).toBe(false);
  });

  it("validates AnswerSpec variants, including the Phase 4 ones", () => {
    const ok: unknown[] = [
      { type: "NUMERIC", value: 5050 },
      { type: "NUMERIC", value: 3.14, tolerance: 0.01, unit: fb("u") },
      { type: "ESTIMATE", min: 4000, max: 6000, truth: 5050 },
      { type: "CHOICE", correctId: "B" },
      { type: "MULTI_VALUE", values: ["1", "5"] },
      { type: "MULTI_VALUE", values: ["1", "5"], orderMatters: true },
      { type: "ORDERING", correctOrder: ["A", "B", "C"] },
      { type: "EXPRESSION", target: 24, allowedNumbers: [1, 3, 4, 6], allowedOps: ["+", "-", "*", "/"] },
      { type: "SCENE_COMPLETION", minimalMoves: 7 },
    ];
    for (const spec of ok) expect(AnswerSpecSchema.safeParse(spec).success, JSON.stringify(spec)).toBe(true);

    const bad: unknown[] = [
      { type: "NUMERIC" },
      { type: "NUMERIC", value: Number.NaN },
      { type: "ESTIMATE", min: 10, max: 20, truth: 30 },
      { type: "MULTI_VALUE", values: [] },
      { type: "ORDERING", correctOrder: ["A", "A"] },
      { type: "EXPRESSION", target: 24, allowedNumbers: [], allowedOps: ["%"] },
      { type: "UNKNOWN" },
    ];
    for (const spec of bad) expect(AnswerSpecSchema.safeParse(spec).success, JSON.stringify(spec)).toBe(false);
  });

  it("normalises the flat README rule shape to the rubric's nested shape and rejects bad matches", () => {
    const parsed = WrongAnswerRulesSchema.parse([
      { match: "10100", feedback: fb("a") },
      { match: "gt:correct", en: "too big", zh: "太大" },
    ]);
    expect(parsed).toEqual([
      { match: "10100", feedback: fb("a") },
      { match: "gt:correct", feedback: { en: "too big", zh: "太大" } },
    ]);
    expect(WrongAnswerRulesSchema.safeParse([{ match: "regex:(", feedback: fb("x") }]).success).toBe(false);
    expect(WrongAnswerRulesSchema.safeParse([{ match: "offByFactor:abc", feedback: fb("x") }]).success).toBe(false);
    expect(WrongAnswerRulesSchema.safeParse([{ match: "gt:", feedback: fb("x") }]).success).toBe(false);
    expect(WrongAnswerRulesSchema.safeParse([{ match: "5", feedback: { en: "", zh: "" } }]).success).toBe(false);
  });

  it("validates choices and solution tags", () => {
    expect(
      ChoicesSchema.safeParse([
        { id: "A", en: "a", zh: "甲", isCorrect: true },
        { id: "B", en: "b", zh: "乙" },
      ]).success
    ).toBe(true);
    expect(ChoicesSchema.safeParse([{ id: "A", en: "a", zh: "甲" }]).success).toBe(false);
    expect(SolutionTagsSchema.safeParse(["pair", "draw"]).success).toBe(true);
    expect(SolutionTagsSchema.safeParse(["magic"]).success).toBe(false);
  });
});

describe("parseMatchRule", () => {
  it("parses every rule kind", () => {
    expect(parseMatchRule("10100")).toEqual({ kind: "exact", value: "10100" });
    expect(parseMatchRule("regex:^1[0-9]{4}$")?.kind).toBe("regex");
    expect(parseMatchRule("gt:correct")).toEqual({ kind: "gt", than: "correct" });
    expect(parseMatchRule("lt:1000")).toEqual({ kind: "lt", than: 1000 });
    expect(parseMatchRule("offByFactor:2")).toEqual({ kind: "offByFactor", factor: 2 });
    expect(parseMatchRule("choice:B")).toEqual({ kind: "choice", id: "B" });
  });

  it("rejects malformed rules", () => {
    expect(parseMatchRule("")).toBeNull();
    expect(parseMatchRule("regex:[")).toBeNull();
    expect(parseMatchRule("offByFactor:1")).toBeNull();
    expect(parseMatchRule("offByFactor:-2")).toBeNull();
    expect(parseMatchRule("choice:")).toBeNull();
  });
});

describe("validateAnswerV2: NUMERIC", () => {
  const spec: AnswerSpec = { type: "NUMERIC", value: 5050 };

  it("reuses v1 normalisation: separators, units, word numbers, fractions", () => {
    expect(validateAnswerV2("5050", spec).isCorrect).toBe(true);
    expect(validateAnswerV2("5,050", spec).isCorrect).toBe(true);
    expect(validateAnswerV2("5，050", spec).isCorrect).toBe(true);
    expect(validateAnswerV2(" 5050 ", spec).isCorrect).toBe(true);
    expect(validateAnswerV2(["5050"], spec).isCorrect).toBe(true);
    expect(validateAnswerV2("12厘米", { type: "NUMERIC", value: 12 }).isCorrect).toBe(true);
    expect(validateAnswerV2("five", { type: "NUMERIC", value: 5 }).isCorrect).toBe(true);
    expect(validateAnswerV2("1 3/4", { type: "NUMERIC", value: 1.75 }).isCorrect).toBe(true);
    expect(validateAnswerV2("7/4", { type: "NUMERIC", value: 1.75 }).isCorrect).toBe(true);
    expect(validateAnswerV2("5051", spec).isCorrect).toBe(false);
  });

  it("fixes the v1 gaps: Unicode minus and empty input against 0", () => {
    expect(validateAnswerV2("−7", { type: "NUMERIC", value: -7 }).isCorrect).toBe(true);
    expect(validateAnswerV2("", { type: "NUMERIC", value: 0 })).toEqual({ isCorrect: false, reason: "empty" });
    expect(validateAnswerV2("   ", spec).reason).toBe("empty");
  });

  it("applies an explicit tolerance, inclusive", () => {
    const pi: AnswerSpec = { type: "NUMERIC", value: 3.14159, tolerance: 0.01 };
    expect(validateAnswerV2("3.14", pi).isCorrect).toBe(true);
    expect(validateAnswerV2("3.15", pi).isCorrect).toBe(true);
    expect(validateAnswerV2("3.2", pi).isCorrect).toBe(false);
    // Default tolerance is v1's 1e-4.
    expect(validateAnswerV2("3.14", { type: "NUMERIC", value: 3.14159 }).isCorrect).toBe(false);
  });

  it("reports unparseable input and multi-element arrays", () => {
    expect(validateAnswerV2("abc", spec)).toEqual({ isCorrect: false, reason: "unparseable" });
    expect(validateAnswerV2(["5050", "1"], spec).reason).toBe("unparseable");
  });
});

describe("validateAnswerV2: ESTIMATE", () => {
  const spec: AnswerSpec = { type: "ESTIMATE", min: 4000, max: 6000, truth: 5000 };

  it("is correct inside [min, max], inclusive, and reports distance from the truth", () => {
    const r = validateAnswerV2("4500", spec);
    expect(r.isCorrect).toBe(true);
    expect(r.detail).toEqual({
      type: "ESTIMATE",
      value: 4500,
      truth: 5000,
      min: 4000,
      max: 6000,
      distance: 0.1,
      direction: "inside",
    });
    expect(validateAnswerV2("4000", spec).isCorrect).toBe(true);
    expect(validateAnswerV2("6000", spec).isCorrect).toBe(true);
  });

  it("is wrong outside the range, with direction and relative distance", () => {
    const low = validateAnswerV2("1000", spec);
    expect(low.isCorrect).toBe(false);
    expect(low.detail).toMatchObject({ direction: "low", distance: 0.8 });
    const high = validateAnswerV2("10,000", spec);
    expect(high.isCorrect).toBe(false);
    expect(high.detail).toMatchObject({ direction: "high", distance: 1 });
  });

  it("accepts 'about' / '约' prefixes and uses absolute distance when the truth is 0", () => {
    expect(validateAnswerV2("about 5000", spec).isCorrect).toBe(true);
    expect(validateAnswerV2("约5000", spec).isCorrect).toBe(true);
    expect(validateAnswerV2("~5500", spec).isCorrect).toBe(true);
    const zero: AnswerSpec = { type: "ESTIMATE", min: -1, max: 1, truth: 0 };
    expect(validateAnswerV2("3", zero).detail).toMatchObject({ distance: 3, direction: "high" });
  });

  it("rejects non-numbers", () => {
    expect(validateAnswerV2("lots", spec).reason).toBe("unparseable");
  });
});

describe("validateAnswerV2: CHOICE", () => {
  const spec: AnswerSpec = { type: "CHOICE", correctId: "B" };

  it("matches the option id exactly and case-sensitively", () => {
    expect(validateAnswerV2("B", spec).isCorrect).toBe(true);
    expect(validateAnswerV2(" B ", spec).isCorrect).toBe(true);
    expect(validateAnswerV2(["B"], spec).isCorrect).toBe(true);
    expect(validateAnswerV2("b", spec).isCorrect).toBe(false);
    expect(validateAnswerV2("A", spec).isCorrect).toBe(false);
    expect(validateAnswerV2(["A", "B"], spec).isCorrect).toBe(false);
  });
});

describe("validateAnswerV2: MULTI_VALUE", () => {
  const spec: AnswerSpec = { type: "MULTI_VALUE", values: ["1", "5"] };

  it.each(["1 and 5", "5 and 1", "1和5", "1, 5", "1，5", "5 & 1", "1; 5", "1、5", "1 5", "1AND5", "  5 ,1  "])(
    "accepts %j for {1, 5}",
    (input) => {
      expect(validateAnswerV2(input, spec).isCorrect).toBe(true);
    }
  );

  it.each(["1 and 7", "1", "1和7", "1, 5, 5", "5", "1 and 5 and 9", "one and seven"])(
    "rejects %j for {1, 5}",
    (input) => {
      expect(validateAnswerV2(input, spec).isCorrect).toBe(false);
    }
  );

  it("accepts arrays and compares numerically (5.0, 10/2, five)", () => {
    expect(validateAnswerV2(["5", "1"], spec).isCorrect).toBe(true);
    expect(validateAnswerV2("1 and 5.0", spec).isCorrect).toBe(true);
    expect(validateAnswerV2("10/2 and 1", spec).isCorrect).toBe(true);
    expect(validateAnswerV2("one and five", spec).isCorrect).toBe(true);
  });

  it("treats values as a multiset", () => {
    const twin: AnswerSpec = { type: "MULTI_VALUE", values: ["2", "2", "3"] };
    expect(validateAnswerV2("2, 3, 2", twin).isCorrect).toBe(true);
    expect(validateAnswerV2("2, 3, 3", twin).isCorrect).toBe(false);
  });

  it("keeps mixed numbers intact when an explicit separator is used", () => {
    const mixed: AnswerSpec = { type: "MULTI_VALUE", values: ["7/4", "2"] };
    expect(validateAnswerV2("1 3/4 and 2", mixed).isCorrect).toBe(true);
  });

  it("compares non-numeric values case-insensitively", () => {
    const words: AnswerSpec = { type: "MULTI_VALUE", values: ["red", "blue"] };
    expect(validateAnswerV2("Blue and RED", words).isCorrect).toBe(true);
    expect(validateAnswerV2("blue and green", words).isCorrect).toBe(false);
  });

  it("respects orderMatters", () => {
    const ordered: AnswerSpec = { type: "MULTI_VALUE", values: ["1", "5"], orderMatters: true };
    expect(validateAnswerV2("1 and 5", ordered).isCorrect).toBe(true);
    expect(validateAnswerV2("5 and 1", ordered).isCorrect).toBe(false);
  });

  it("reports how many values were expected and given", () => {
    expect(validateAnswerV2("1", spec).detail).toEqual({ type: "MULTI_VALUE", expectedCount: 2, givenCount: 1 });
  });

  it("splits on every documented separator", () => {
    expect(splitMultiValue("1 and 2和3&4,5，6;7、8")).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(splitMultiValue("sand and band")).toEqual(["sand", "band"]);
  });
});

describe("validateAnswerV2: ORDERING", () => {
  const spec: AnswerSpec = { type: "ORDERING", correctOrder: ["C", "A", "B"] };

  it("requires the exact order, from an array or a > / , separated string", () => {
    expect(validateAnswerV2(["C", "A", "B"], spec).isCorrect).toBe(true);
    expect(validateAnswerV2("C > A > B", spec).isCorrect).toBe(true);
    expect(validateAnswerV2("C, A, B", spec).isCorrect).toBe(true);
    expect(validateAnswerV2(["A", "B", "C"], spec).isCorrect).toBe(false);
    expect(validateAnswerV2(["C", "A"], spec).isCorrect).toBe(false);
    expect(validateAnswerV2("c > a > b", spec).isCorrect).toBe(false);
    expect(splitOrdering("C>A，B")).toEqual(["C", "A", "B"]);
  });
});

describe("validateAnswerV2: EXPRESSION and SCENE_COMPLETION", () => {
  it("judges EXPRESSION with the safe parser (6/(1-3/4) makes 24 from 1, 3, 4, 6)", () => {
    expect(
      validateAnswerV2("(6/(1-3/4))", { type: "EXPRESSION", target: 24, allowedNumbers: [1, 3, 4, 6], allowedOps: ["/", "-"] })
    ).toMatchObject({ isCorrect: true, detail: { type: "EXPRESSION", value: 24, numbersOk: true, disallowedOps: [] } });
  });

  it("still returns reason 'unsupported' for SCENE_COMPLETION instead of throwing", () => {
    expect(validateAnswerV2("done", { type: "SCENE_COMPLETION" })).toEqual({ isCorrect: false, reason: "unsupported" });
  });
});

describe("wrongAnswerFeedbackFor", () => {
  const gauss: AnswerSpec = { type: "NUMERIC", value: 5050 };

  it("matches an exact value numerically (10,100 matches '10100')", () => {
    expect(wrongAnswerFeedbackFor("10,100", gauss, [rule("10100")])?.match).toBe("10100");
    expect(wrongAnswerFeedbackFor("10101", gauss, [rule("10100")])).toBeNull();
  });

  it("matches a regex against the trimmed raw input", () => {
    expect(wrongAnswerFeedbackFor(" 12345 ", gauss, [rule("regex:^1[0-9]{4}$")])?.match).toBe("regex:^1[0-9]{4}$");
    expect(wrongAnswerFeedbackFor("2345", gauss, [rule("regex:^1[0-9]{4}$")])).toBeNull();
  });

  it("matches gt:correct / lt:correct against a NUMERIC value", () => {
    const rules = [rule("gt:correct"), rule("lt:correct")];
    expect(wrongAnswerFeedbackFor("6000", gauss, rules)?.match).toBe("gt:correct");
    expect(wrongAnswerFeedbackFor("10", gauss, rules)?.match).toBe("lt:correct");
  });

  it("matches gt / lt against a literal number (rubric example lt:1000)", () => {
    expect(wrongAnswerFeedbackFor("999", gauss, [rule("lt:1000")])?.match).toBe("lt:1000");
    expect(wrongAnswerFeedbackFor("1000", gauss, [rule("lt:1000")])).toBeNull();
    expect(wrongAnswerFeedbackFor("9001", gauss, [rule("gt:9000")])?.match).toBe("gt:9000");
  });

  it("matches gt:correct / lt:correct against the ESTIMATE range, not the truth", () => {
    const est: AnswerSpec = { type: "ESTIMATE", min: 4000, max: 6000, truth: 5000 };
    const rules = [rule("gt:correct"), rule("lt:correct")];
    expect(wrongAnswerFeedbackFor("7000", est, rules)?.match).toBe("gt:correct");
    expect(wrongAnswerFeedbackFor("100", est, rules)?.match).toBe("lt:correct");
    // Inside the range is correct, so no wrong-answer feedback even though 5500 > truth.
    expect(wrongAnswerFeedbackFor("5500", est, rules)).toBeNull();
  });

  it("matches offByFactor in both directions", () => {
    const rules = [rule("offByFactor:2")];
    expect(wrongAnswerFeedbackFor("10100", gauss, rules)?.match).toBe("offByFactor:2");
    expect(wrongAnswerFeedbackFor("2525", gauss, rules)?.match).toBe("offByFactor:2");
    expect(wrongAnswerFeedbackFor("5000", gauss, rules)).toBeNull();
    const est: AnswerSpec = { type: "ESTIMATE", min: 90, max: 110, truth: 100 };
    expect(wrongAnswerFeedbackFor("1000", est, [rule("offByFactor:10")])?.match).toBe("offByFactor:10");
  });

  it("matches choice:ID for CHOICE answers", () => {
    const spec: AnswerSpec = { type: "CHOICE", correctId: "B" };
    const rules = [rule("choice:A"), rule("choice:C")];
    expect(wrongAnswerFeedbackFor("A", spec, rules)?.match).toBe("choice:A");
    expect(wrongAnswerFeedbackFor("C", spec, rules)?.match).toBe("choice:C");
    expect(wrongAnswerFeedbackFor("D", spec, rules)).toBeNull();
  });

  it("matches an exact MULTI_VALUE rule order-insensitively", () => {
    const spec: AnswerSpec = { type: "MULTI_VALUE", values: ["1", "5"] };
    expect(wrongAnswerFeedbackFor("7和1", spec, [rule("1 and 7")])?.match).toBe("1 and 7");
    expect(wrongAnswerFeedbackFor("1 and 6", spec, [rule("1 and 7")])).toBeNull();
  });

  it("matches an exact ORDERING rule", () => {
    const spec: AnswerSpec = { type: "ORDERING", correctOrder: ["A", "B", "C"] };
    expect(wrongAnswerFeedbackFor(["C", "B", "A"], spec, [rule("C > B > A")])?.match).toBe("C > B > A");
  });

  it("returns the FIRST matching rule, in order", () => {
    const rules = [rule("10100"), rule("gt:correct"), rule("offByFactor:2")];
    expect(wrongAnswerFeedbackFor("10100", gauss, rules)?.match).toBe("10100");
    expect(wrongAnswerFeedbackFor("10100", gauss, rules.slice(1))?.match).toBe("gt:correct");
  });

  it("never gives feedback for a correct answer, and skips malformed rules", () => {
    expect(wrongAnswerFeedbackFor("5050", gauss, [rule("regex:.*")])).toBeNull();
    expect(wrongAnswerFeedbackFor("1", gauss, [rule("regex:("), rule("lt:correct")])?.match).toBe("lt:correct");
  });

  it("does not apply numeric rules to non-numeric spec types", () => {
    const spec: AnswerSpec = { type: "CHOICE", correctId: "B" };
    expect(wrongAnswerFeedbackFor("A", spec, [rule("gt:correct"), rule("offByFactor:2")])).toBeNull();
  });
});
