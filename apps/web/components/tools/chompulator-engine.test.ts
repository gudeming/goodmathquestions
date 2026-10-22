import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

/**
 * Chompulator lives in one static file (public/chompulator.html). Its maths sits in
 * <script id="chomp-engine">, which only touches `window.ChompEngine`, so we can run
 * that script on its own in a bare VM context and test it like a module.
 */
const HTML = readFileSync(fileURLToPath(new URL("../../public/chompulator.html", import.meta.url)), "utf8");

/* eslint-disable @typescript-eslint/no-explicit-any */
function loadEngine(): any {
  const m = /<script id="chomp-engine">([\s\S]*?)<\/script>/.exec(HTML);
  if (!m) throw new Error("chomp-engine script not found");
  const sandbox: { window: Record<string, unknown> } = { window: {} };
  vm.runInNewContext(m[1], sandbox);
  return sandbox.window.ChompEngine;
}

const E = loadEngine();
const sci = (src: string, angle = "DEG") => E.sci.evaluate(src, { angle });
const val = (src: string, angle = "DEG") => {
  const r = sci(src, angle);
  if (!r.ok) throw new Error(`${src} failed: ${r.type}`);
  return r.value as number;
};

describe("chomp-engine script", () => {
  it("exposes ChompEngine and nothing else", () => {
    const m = /<script id="chomp-engine">([\s\S]*?)<\/script>/.exec(HTML)!;
    const sandbox: { window: Record<string, unknown> } = { window: {} };
    vm.runInNewContext(m[1], sandbox);
    expect(Object.keys(sandbox.window)).toEqual(["ChompEngine"]);
    expect(Object.keys(sandbox).sort()).toEqual(["window"]);
  });

  it("never uses eval or new Function", () => {
    expect(HTML).not.toMatch(/\beval\s*\(/);
    expect(HTML).not.toMatch(/new\s+Function\s*\(/);
  });
});

describe("SCI: parser and evaluator", () => {
  it("does trig in degrees with clean answers", () => {
    expect(val("sin(30)")).toBe(0.5);
    expect(val("cos(90)")).toBe(0);
    expect(val("tan(45)")).toBe(1);
    expect(val("atan(1)")).toBe(45);
    expect(val("sin⁻¹(0.5)")).toBe(30);
    expect(val("sin(-30)")).toBe(-0.5);
  });

  it("honours RAD and GRAD", () => {
    expect(val("sin(π)", "RAD")).toBe(0);
    expect(val("cos(π)", "RAD")).toBe(-1);
    expect(val("sin(100)", "GRAD")).toBe(1);
    expect(val("atan(1)", "RAD")).toBeCloseTo(Math.PI / 4, 15);
  });

  it("types its errors", () => {
    expect(sci("asin(2)")).toMatchObject({ ok: false, type: "domain", fn: "asin" });
    expect(sci("ln(-1)")).toMatchObject({ ok: false, type: "domain", fn: "ln" });
    expect(sci("tan(90)")).toMatchObject({ ok: false, type: "undefined" });
    expect(sci("tan(π/2)", "RAD")).toMatchObject({ ok: false, type: "undefined" });
    expect(sci("1/0")).toMatchObject({ ok: false, type: "divzero" });
    expect(sci("5 mod 0")).toMatchObject({ ok: false, type: "divzero" });
    expect(sci("2+")).toMatchObject({ ok: false, type: "syntax" });
    expect(sci("1.2.3")).toMatchObject({ ok: false, type: "syntax" });
    expect(sci("(2+3))")).toMatchObject({ ok: false, type: "syntax" });
    expect(sci("171!")).toMatchObject({ ok: false, type: "overflow" });
    expect(sci("")).toMatchObject({ ok: false, type: "empty" });
  });

  it("follows precedence, associativity and unary minus", () => {
    expect(val("2+3*4")).toBe(14);
    expect(val("(2+3)*4")).toBe(20);
    expect(val("-2^2")).toBe(-4);
    expect(val("2^3^2")).toBe(512);
    expect(val("2^-3")).toBe(0.125);
    expect(val("2×−3")).toBe(-6);
    expect(val("−3!")).toBe(-6);
    expect(val("sin(30)^2")).toBe(0.25);
  });

  it("knows the rest of the keypad", () => {
    expect(val("5!")).toBe(120);
    expect(val("0!")).toBe(1);
    expect(val("0.5!")).toBeCloseTo(Math.sqrt(Math.PI) / 2, 12);
    expect(val("10 mod 3")).toBe(1);
    expect(val("-7 mod 3")).toBe(2);
    expect(val("√2")).toBeCloseTo(1.41421356237, 11);
    expect(val("∛(-27)")).toBe(-3);
    expect(val("3ʸ√8")).toBe(2);
    expect(val("ln(e)")).toBe(1);
    expect(val("log₁₀(1000)")).toBe(3);
    expect(val("log₂(1024)")).toBe(10);
    expect(val("e^(0)")).toBe(1);
    expect(val("3²")).toBe(9);
    expect(val("2³")).toBe(8);
    expect(val("4⁻¹")).toBe(0.25);
    expect(val("50%")).toBe(0.5);
    expect(val("abs(-4)")).toBe(4);
    expect(val("2π")).toBeCloseTo(2 * Math.PI, 14);
    expect(val("(2+3")).toBe(5); // unclosed brackets close themselves
    expect(val("0.1+0.2")).toBe(0.3); // snapped to the clean value
    expect(val("2E3")).toBe(2000);
    expect(E.sci.evaluate("Ans×2", { ans: 21 }).value).toBe(42);
  });

  it("formats to 12 significant digits", () => {
    const f = E.sci.format;
    expect(f(1 / 3)).toBe("0.333333333333");
    expect(f(123456789012)).toBe("123456789012");
    expect(f(1234567890123)).toBe("1.23456789012E12");
    expect(f(1e-10)).toBe("1E-10");
    expect(f(0.000000001)).toBe("0.000000001");
    expect(f(2.5)).toBe("2.5");
    expect(f(-0)).toBe("0");
  });
});

describe("BITS: bases, two's complement, shifts", () => {
  const B = () => E.bits;
  it("shows one value in every base", () => {
    expect(B().formatAll(255n, 8, false)).toEqual({ DEC: "255", HEX: "FF", BIN: "11111111", OCT: "377" });
  });

  it("does two's complement", () => {
    const neg1 = B().parse("-1", "DEC", 8, true);
    expect(neg1.ok).toBe(true);
    expect(B().format(neg1.value, "HEX", 8, true)).toBe("FF");
    expect(B().toSigned(0xffn, 8)).toBe(-1n);
    expect(B().format(0xffn, "DEC", 8, true)).toBe("-1");
    const all = B().parse("FFFFFFFFFFFFFFFF", "HEX", 64, true);
    expect(B().format(all.value, "DEC", 64, true)).toBe("-1");
    expect(B().format(all.value, "DEC", 64, false)).toBe("18446744073709551615");
  });

  it("shifts and rotates", () => {
    expect(B().op("shl", 1n, 3n, 8, false).value).toBe(8n);
    expect(B().op("sar", 0x80n, 1n, 8, true).value).toBe(0xc0n);
    expect(B().op("shr", 0x80n, 1n, 8, true).value).toBe(0x40n);
    expect(B().op("rol", 0x81n, 1n, 8, false).value).toBe(0x03n);
    expect(B().op("ror", 0x81n, 1n, 8, false).value).toBe(0xc0n);
    expect(B().op("shl", 0x80n, 1n, 8, false)).toMatchObject({ value: 0n, lost: true });
  });

  it("wraps on overflow and says so", () => {
    expect(B().op("add", 255n, 1n, 8, false)).toMatchObject({ value: 0n, overflow: true });
    expect(B().op("add", 127n, 1n, 8, true)).toMatchObject({ value: 0x80n, overflow: true });
    expect(B().op("add", 1n, 1n, 8, false)).toMatchObject({ value: 2n, overflow: false });
    expect(B().op("div", 7n, 0n, 8, false).error).toBe("divzero");
    expect(B().op("not", 0n, 0n, 16, false).value).toBe(0xffffn);
    expect(B().parse("256", "DEC", 8, false).overflow).toBe(true);
    expect(B().parse("2", "BIN", 8, false).ok).toBe(false);
  });
});

describe("FLOAT: IEEE 754 X-ray", () => {
  const F = () => E.float;
  it("takes float32(0.1) apart", () => {
    const d = F().encode(0.1, 32);
    expect(d.hex).toBe("0x3DCCCCCD");
    expect(d.expField).toBe(123);
    expect(d.realExp).toBe(-4);
    expect(d.bias).toBe(127);
    expect(d.mantissaHex).toBe("0x4CCCCD");
    expect(d.mantissa).toBe(0x4ccccdn);
    expect(d.exact).toBe("0.100000001490116119384765625");
    expect(d.kind).toBe("normal");
  });

  it("knows float64", () => {
    expect(F().encode(1, 64).hex).toBe("0x3FF0000000000000");
    expect(F().encode(0.1 + 0.2, 64).exact).toBe("0.3000000000000000444089209850062616169452667236328125");
    expect(F().nextUp(1, 64)).toBe(1 + 2 ** -52);
    expect(F().nextDown(1, 64)).toBe(1 - 2 ** -53);
  });

  it("handles the special cases", () => {
    expect(F().encode(16777217, 32).value).toBe(16777216);
    const tiny = F().encode(2 ** -149, 32);
    expect(tiny.hex).toBe("0x00000001");
    expect(tiny.kind).toBe("subnormal");
    expect(tiny.isMinSub).toBe(true);
    const negZero = F().encode(-0, 64);
    expect(negZero.sign).toBe(1);
    expect(negZero.kind).toBe("zero");
    const inf = F().encode(Infinity, 32);
    expect(inf.expField).toBe(255);
    expect(inf.mantissa).toBe(0n);
    expect(inf.kind).toBe("inf");
    expect(F().encode(NaN, 64).kind).toBe("nan");
    expect(F().encode(3.4028234663852886e38, 32).isMax).toBe(true);
  });

  it("re-decodes toggled bits", () => {
    const d = F().decode(0x3f800000n, 32);
    expect(d.value).toBe(1);
    expect(F().decode(0x3f800000n | (1n << 31n), 32).value).toBe(-1);
  });

  it("rounds decimals correctly and measures the error vs what was typed", () => {
    const a = F().analyze("0.1");
    expect(a.ok).toBe(true);
    expect(a.f32.hex).toBe("0x3DCCCCCD");
    expect(a.f32.error.exact).toBe("0.000000001490116119384765625");
    const sum = F().analyze("0.1 + 0.2");
    expect(sum.f64.shortest).toBe("0.30000000000000004");
    expect(sum.f64.meant).toBe("0.3");
    expect(F().analyze("16777217").f32.error.exact).toBe("-1");
    expect(F().analyze("2^53 + 1").f64.error.exact).toBe("-1");
    expect(F().analyze("1e39").f32.kind).toBe("inf");
    expect(F().analyze("1/3").f64.meantRepeats).toBe(true);
    // the float32 conversion is exact, not double-rounded through float64
    const q = F().parseDecimal("3.4028235677973366e38");
    expect(F().roundRational(q.n, q.d, 32)).toBe(0x7f7fffffn);
  });
});
