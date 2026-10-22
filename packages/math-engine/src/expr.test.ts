import { describe, expect, it } from "vitest";
import { EXPR_MAX_LENGTH, evaluateExpression, sameMultiset, type ExprOp } from "./expr";
import { validateAnswerV2, wrongAnswerFeedbackFor, type AnswerSpec } from "./answer-spec";

/** Small seeded PRNG so the fuzz run is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALL_OPS: ExprOp[] = ["+", "-", "*", "/", "^", "!", "sqrt", "concat"];
type ExpressionSpec = Extract<AnswerSpec, { type: "EXPRESSION" }>;
const fourFours = (target: number, allowedOps: ExprOp[] = ALL_OPS): ExpressionSpec => ({
  type: "EXPRESSION",
  target,
  allowedNumbers: [4, 4, 4, 4],
  allowedOps,
});

function ok(input: string, allowedOps: ExprOp[] = ALL_OPS) {
  const r = evaluateExpression(input, { allowedOps });
  if (!r.ok) throw new Error(`expected ${input} to parse, got ${r.error.code}`);
  return r;
}

function errorCode(input: string, allowedOps: ExprOp[] = ALL_OPS) {
  const r = evaluateExpression(input, { allowedOps });
  return r.ok ? null : r.error.code;
}

describe("evaluateExpression: arithmetic", () => {
  it("respects precedence, associativity and parentheses", () => {
    expect(ok("2+3*4").value).toBe(14);
    expect(ok("(2+3)*4").value).toBe(20);
    expect(ok("10-4-3").value).toBe(3);
    expect(ok("64/4/4").value).toBe(4);
    expect(ok("2^3^2").value).toBe(512); // right-associative
    expect(ok("-2^2").value).toBe(-4); // -(2^2)
    expect(ok("2^-1").value).toBe(0.5);
    expect(ok("--4").value).toBe(4);
  });

  it("supports factorial (<= 12), sqrt(x) and √x", () => {
    expect(ok("4!").value).toBe(24);
    expect(ok("3!!").value).toBe(720);
    expect(ok("12!").value).toBe(479001600);
    expect(ok("sqrt(16)").value).toBe(4);
    expect(ok("√16").value).toBe(4);
    expect(ok("√(4+5)").value).toBe(3);
    expect(ok("√4!").value).toBe(2); // (√4)!
    expect(ok("sqrt(4)*sqrt(4)").opsUsed).toEqual(expect.arrayContaining(["sqrt", "*"]));
  });

  it("accepts the symbols kids type: × ÷ − and spaces", () => {
    expect(ok("4 × 4 ÷ 4 − 4").value).toBe(0);
    expect(ok(" ( 4 + 4 ) ").value).toBe(8);
  });

  it("reports numbers in reading order and the operators used", () => {
    const r = ok("4+4-4/4");
    expect(r.numbersUsed).toEqual([4, 4, 4, 4]);
    expect(new Set(r.opsUsed)).toEqual(new Set(["+", "-", "/"]));
  });
});

describe("evaluateExpression: concatenation", () => {
  it("reads 44 as two 4s only when concat is allowed", () => {
    const withConcat = ok("44/4-4");
    expect(withConcat.value).toBe(7);
    expect(withConcat.numbersUsed).toEqual([4, 4, 4, 4]);
    expect(withConcat.opsUsed).toContain("concat");

    const without = ok("44/4-4", ["+", "-", "*", "/"]);
    expect(without.value).toBe(7);
    expect(without.numbersUsed).toEqual([44, 4, 4]);
    expect(without.opsUsed).not.toContain("concat");
  });

  it("keeps a multi-digit number whole without concat (24-game style)", () => {
    expect(ok("10*3-6", ["+", "-", "*", "/"]).numbersUsed).toEqual([10, 3, 6]);
  });
});

describe("evaluateExpression: rejections", () => {
  it("rejects empty, too long and invalid tokens", () => {
    expect(errorCode("")).toBe("empty");
    expect(errorCode("   ")).toBe("empty");
    expect(errorCode("4".repeat(EXPR_MAX_LENGTH + 1))).toBe("too_long");
    expect(errorCode("1+".repeat(100) + "1")).toBe("too_long");
    expect(errorCode("eval(4)")).toBe("invalid_token");
    expect(errorCode("Function('x')")).toBe("invalid_token");
    expect(errorCode("4.4")).toBe("invalid_token");
    expect(errorCode("4%4")).toBe("invalid_token");
    expect(errorCode("alert`1`")).toBe("invalid_token");
  });

  it("rejects syntax errors, including ** and sqrt without parentheses", () => {
    expect(errorCode("4**4**4**4")).toBe("syntax");
    expect(errorCode("4+")).toBe("syntax");
    expect(errorCode("(4+4")).toBe("syntax");
    expect(errorCode("4+4)")).toBe("syntax");
    expect(errorCode("()")).toBe("syntax");
    expect(errorCode("4 4")).toBe("syntax");
    expect(errorCode("sqrt4")).toBe("syntax");
    expect(errorCode("!4")).toBe("syntax");
  });

  it("rejects division by zero, roots of negatives and big factorials", () => {
    expect(errorCode("4/(4-4)")).toBe("division_by_zero");
    expect(errorCode("0^-1")).toBe("division_by_zero");
    expect(errorCode("sqrt(4-8)")).toBe("domain");
    expect(errorCode("(0-8)^(1/3)")).toBe("domain");
    expect(errorCode("13!")).toBe("factorial_range");
    expect(errorCode("(1/2)!")).toBe("factorial_range");
    expect(errorCode("4!!")).toBe("factorial_range"); // 24! is too big
  });

  it("rejects depth and size bombs fast", () => {
    const bombs = [
      "4^4^4^4",
      "9^9^9^9^9^9^9^9^9^9^9^9^9^9^9^9^9^9^9^9^9^9^9^9^9^9^9^9^9",
      "(".repeat(25) + "4" + ")".repeat(25),
      "-".repeat(59) + "4",
      "√".repeat(59) + "4",
      "3!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
      "9999999999999*9999999999",
    ];
    for (const b of bombs) {
      const start = performance.now();
      const r = evaluateExpression(b);
      expect(performance.now() - start).toBeLessThan(5);
      expect(r.ok, b).toBe(false);
    }
    expect(errorCode("4^4^4^4")).toBe("out_of_range");
    expect(errorCode("(".repeat(25) + "4" + ")".repeat(25))).toBe("too_deep");
    expect(errorCode("-".repeat(59) + "4")).toBe("too_deep");
  });

  it("allows reasonable nesting (up to the depth limit)", () => {
    expect(ok("(".repeat(10) + "4" + ")".repeat(10)).value).toBe(4);
  });
});

describe("validateAnswerV2: EXPRESSION (four fours)", () => {
  it.each([
    ["44/4-4", 7],
    ["4+4-4/4", 7],
    ["(44-4)/4", 10],
    ["4/4+4/4", 2],
    ["4!-4*4-4", 4],
    ["sqrt(4)+sqrt(4)+4-4", 4],
  ])("accepts %s = %d", (input, target) => {
    expect(validateAnswerV2(input, fourFours(target)).isCorrect).toBe(true);
  });

  it("rejects three 4s and five 4s even when the value is right", () => {
    expect(validateAnswerV2("4+4-4/4+4-4", fourFours(7))).toMatchObject({
      isCorrect: false,
      detail: { type: "EXPRESSION", value: 7, numbersOk: false },
    });
    expect(validateAnswerV2("4+4-4/4", { ...fourFours(7), allowedNumbers: [4, 4, 4] }).isCorrect).toBe(false);
    expect(validateAnswerV2("44/4-4", { ...fourFours(7), allowedNumbers: [4, 4, 4] }).isCorrect).toBe(false);
    expect(validateAnswerV2("4+4", fourFours(8))).toMatchObject({ isCorrect: false, detail: { numbersOk: false } });
  });

  it("rejects other numbers and a wrong value", () => {
    expect(validateAnswerV2("8-1+4-4", fourFours(7)).isCorrect).toBe(false);
    expect(validateAnswerV2("4+4+4-4", fourFours(7))).toMatchObject({ isCorrect: false, detail: { value: 8 } });
  });

  it("rejects operators that are not allowed", () => {
    const noConcat = fourFours(7, ["+", "-", "*", "/"]);
    expect(validateAnswerV2("44/4-4", noConcat).isCorrect).toBe(false);
    expect(validateAnswerV2("4+4-4/4", noConcat).isCorrect).toBe(true);
    expect(validateAnswerV2("4!/4+4-4", noConcat)).toMatchObject({ isCorrect: false, detail: { disallowedOps: ["!"] } });
  });

  it("returns 'unparseable' with the parser error for malicious input, never throws", () => {
    for (const input of ["eval('4')", "4**4**4**4", "x".repeat(200), "4/(4-4)+4+4"]) {
      const r = validateAnswerV2(input, fourFours(7));
      expect(r.isCorrect).toBe(false);
      expect(r.reason).toBe("unparseable");
    }
    expect(validateAnswerV2("4/(4-4)+4+4", fourFours(7)).detail).toMatchObject({ error: "division_by_zero" });
  });

  it("supports gt/lt:correct feedback rules on the evaluated value", () => {
    const spec = fourFours(7);
    const rules = [
      { match: "gt:correct", feedback: { en: "Too big", zh: "太大了" } },
      { match: "lt:correct", feedback: { en: "Too small", zh: "太小了" } },
    ];
    expect(wrongAnswerFeedbackFor("4+4+4-4", spec, rules)?.feedback.en).toBe("Too big");
    expect(wrongAnswerFeedbackFor("4-4+4-4", spec, rules)?.feedback.en).toBe("Too small");
    expect(wrongAnswerFeedbackFor("44/4-4", spec, rules)).toBeNull();
  });
});

describe("sameMultiset", () => {
  it("compares with multiplicity, ignoring order", () => {
    expect(sameMultiset([4, 1, 4], [4, 4, 1])).toBe(true);
    expect(sameMultiset([4, 4], [4, 4, 4])).toBe(false);
    expect(sameMultiset([4, 1], [4, 4])).toBe(false);
  });
});

describe("evaluateExpression: fuzz", () => {
  const ALPHABET = ["4", "44", "1", "0", "+", "-", "*", "/", "^", "!", "(", ")", "sqrt", "√", " ", "×", "÷", ".", "e", "**", "x", "%", "9"];

  it("500 random token strings never throw and each finishes in < 5 ms", () => {
    const rand = mulberry32(20261022);
    let slowest = 0;
    let parsedOk = 0;
    for (let n = 0; n < 500; n++) {
      const len = 1 + Math.floor(rand() * 40);
      let s = "";
      for (let k = 0; k < len; k++) s += ALPHABET[Math.floor(rand() * ALPHABET.length)];
      const start = performance.now();
      let r: ReturnType<typeof evaluateExpression> | undefined;
      expect(() => {
        r = evaluateExpression(s, { allowedOps: n % 2 === 0 ? ALL_OPS : ["+", "-"] });
      }, s).not.toThrow();
      slowest = Math.max(slowest, performance.now() - start);
      expect(r).toBeDefined();
      if (r?.ok) {
        parsedOk++;
        expect(Number.isFinite(r.value), s).toBe(true);
      }
    }
    expect(slowest).toBeLessThan(5);
    // The alphabet is valid often enough that the success path is exercised too.
    expect(parsedOk).toBeGreaterThan(0);
  });
});
