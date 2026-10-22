import { describe, expect, it } from "vitest";
import { validateAnswer } from "./validator";
import { validateAnswerV2, type AnswerSpec } from "./answer-spec";

// These tests pin the CURRENT behaviour of validateAnswer(). Cases marked
// "KNOWN GAP" are wrong in v1 and stay pinned: legacy DRILL questions keep v1.
// The multi-value gaps are fixed by validateAnswerV2 (answer-spec.ts, Phase 1).

describe("validateAnswer: integers and decimals", () => {
  it("accepts an exact integer", () => {
    expect(validateAnswer("42", "42")).toBe(true);
  });

  it("ignores surrounding whitespace and letter case", () => {
    expect(validateAnswer("  42 ", "42")).toBe(true);
    expect(validateAnswer("4X^3", "4x^3")).toBe(true);
  });

  it("compares numerically, so 42.0 equals 42 and 102.40 equals 102.4", () => {
    expect(validateAnswer("42.0", "42")).toBe(true);
    expect(validateAnswer("102.40", "102.4")).toBe(true);
  });

  it("uses a 1e-4 tolerance", () => {
    expect(validateAnswer("3.14159", "3.14159265")).toBe(true);
    expect(validateAnswer("3.14", "3.14159")).toBe(false);
  });
});

describe("validateAnswer: fractions and mixed numbers", () => {
  it("accepts the same fraction", () => {
    expect(validateAnswer("3/4", "3/4")).toBe(true);
  });

  it("accepts equivalent fractions (6/8 = 3/4) and tolerates spaces around the slash", () => {
    expect(validateAnswer("6/8", "3/4")).toBe(true);
    expect(validateAnswer("3 / 4", "3/4")).toBe(true);
  });

  it("accepts a mixed number against an improper fraction (1 3/4 = 7/4)", () => {
    expect(validateAnswer("1 3/4", "7/4")).toBe(true);
    expect(validateAnswer("7/4", "1 3/4")).toBe(true);
  });

  it("rejects a different fraction and a zero denominator", () => {
    expect(validateAnswer("2/3", "3/4")).toBe(false);
    expect(validateAnswer("3/0", "3/4")).toBe(false);
  });

  it("KNOWN GAP: a decimal is not matched against a fraction (0.25 vs 1/4, 1.75 vs 1 3/4)", () => {
    expect(validateAnswer("0.25", "1/4")).toBe(false);
    expect(validateAnswer("1.75", "1 3/4")).toBe(false);
  });
});

describe("validateAnswer: negative numbers", () => {
  it("accepts a negative integer and a negative fraction", () => {
    expect(validateAnswer("-7", "-7")).toBe(true);
    expect(validateAnswer("-6/8", "-3/4")).toBe(true);
  });

  it("does not drop the sign", () => {
    expect(validateAnswer("7", "-7")).toBe(false);
  });

  it("KNOWN GAP: the Unicode minus sign (−7) is not understood", () => {
    expect(validateAnswer("−7", "-7")).toBe(false);
  });
});

describe("validateAnswer: separators and symbols", () => {
  it("strips ASCII and full-width / Chinese commas used as thousands separators", () => {
    expect(validateAnswer("3,600", "3600")).toBe(true);
    expect(validateAnswer("3，600", "3600")).toBe(true);
    expect(validateAnswer("1，000，000", "1,000,000")).toBe(true);
  });

  it("ignores the degree symbol (180° = 180)", () => {
    expect(validateAnswer("180°", "180")).toBe(true);
    expect(validateAnswer("180", "180°")).toBe(true);
    expect(validateAnswer("180 °", "180°")).toBe(true);
  });
});

describe("validateAnswer: trailing units and word numbers", () => {
  it("accepts a number followed by a unit word (65 degrees, 5 faces)", () => {
    expect(validateAnswer("65 degrees", "65")).toBe(true);
    expect(validateAnswer("65°", "65 degrees")).toBe(true);
    expect(validateAnswer("5 faces", "5")).toBe(true);
    expect(validateAnswer("12 cm", "12")).toBe(true);
  });

  it("accepts a number followed by a Chinese unit (12厘米)", () => {
    expect(validateAnswer("12厘米", "12")).toBe(true);
  });

  it("accepts word numbers zero to twenty, with or without a unit", () => {
    expect(validateAnswer("five", "5")).toBe(true);
    expect(validateAnswer("Twenty", "20")).toBe(true);
    expect(validateAnswer("five faces", "5")).toBe(true);
  });

  it("rejects a wrong number even when the unit matches", () => {
    expect(validateAnswer("6 faces", "5 faces")).toBe(false);
  });

  it("KNOWN GAP: word numbers above twenty are not understood", () => {
    expect(validateAnswer("twenty-one", "21")).toBe(false);
  });
});

describe("validateAnswer: multi-value answers (v1 gap; fixed by validateAnswerV2 / MULTI_VALUE)", () => {
  it("accepts the exact same multi-value string", () => {
    expect(validateAnswer("1 and 5", "1 and 5")).toBe(true);
  });

  it("KNOWN GAP: order matters today, so '5 and 1' is rejected for '1 and 5'", () => {
    expect(validateAnswer("5 and 1", "1 and 5")).toBe(false);
  });

  it("KNOWN GAP: a comma-separated list is rejected ('1, 5' for '1 and 5')", () => {
    expect(validateAnswer("1, 5", "1 and 5")).toBe(false);
  });

  // The suffix rule reads "1 and 5" as the number 1 followed by the unit "and 5",
  // so ONLY the first value is compared. These false positives are the real bug.
  it("KNOWN GAP (false positive): any answer starting with the same first value is accepted", () => {
    expect(validateAnswer("1 and 7", "1 and 5")).toBe(true);
    expect(validateAnswer("1", "1 and 5")).toBe(true);
    // "1和5" passes only by the same accident; "1和7" passes too.
    expect(validateAnswer("1和5", "1 and 5")).toBe(true);
    expect(validateAnswer("1和7", "1 and 5")).toBe(true);
  });

  // Fixed in v2 (Phase 1): MULTI_VALUE questions use validateAnswerV2. v1 above stays pinned.
  const oneAndFive: AnswerSpec = { type: "MULTI_VALUE", values: ["1", "5"] };

  it("v2: '5 and 1' equals '1 and 5' when orderMatters is false", () => {
    expect(validateAnswerV2("5 and 1", oneAndFive).isCorrect).toBe(true);
    expect(validateAnswerV2("1, 5", oneAndFive).isCorrect).toBe(true);
    expect(validateAnswerV2("1和5", oneAndFive).isCorrect).toBe(true);
  });

  it("v2: '1 and 7', '1', '1和7' are rejected for '1 and 5'", () => {
    expect(validateAnswerV2("1 and 7", oneAndFive).isCorrect).toBe(false);
    expect(validateAnswerV2("1", oneAndFive).isCorrect).toBe(false);
    expect(validateAnswerV2("1和7", oneAndFive).isCorrect).toBe(false);
  });
});

describe("validateAnswer: negative cases", () => {
  it("rejects a different number", () => {
    expect(validateAnswer("7", "8")).toBe(false);
  });

  it("rejects non-numeric text against a numeric answer", () => {
    expect(validateAnswer("abc", "5")).toBe(false);
    expect(validateAnswer("five", "6")).toBe(false);
  });

  it("does not normalise algebraic expressions (x^2 + C vs x^2+c)", () => {
    expect(validateAnswer("x^2+c", "x^2 + C")).toBe(false);
  });

  it("rejects an empty answer for a non-zero answer", () => {
    expect(validateAnswer("", "5")).toBe(false);
  });

  it("KNOWN GAP (false positive): an empty answer is accepted when the answer is 0", () => {
    // Number("") === 0. The UI blocks empty submits today; validateAnswerV2 should too.
    expect(validateAnswer("", "0")).toBe(true);
  });
});
