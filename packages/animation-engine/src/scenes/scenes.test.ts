import { describe, expect, it } from "vitest";
import { countSquares, handshakes, squaresOfSize, pairKey } from "./counting";
import { mulberry32, randomInt } from "./random";
import { checkTrickInput, formatLinear, formatTrickStep, linearTrace, randomTrickInput, runTrick, reverseNumber, trickWidth } from "./number-trick";
import { hostOpens, montyOdds, playMontyRound, simulateMonty } from "./monty-hall";
import { SAMPLE_SCENE_CONFIGS, TRICK_SAMPLES } from "../samples";
import { parseSceneConfig, type NumberTrickStepperConfig } from "../schema";

function trick(input: unknown): NumberTrickStepperConfig {
  const r = parseSceneConfig(input);
  if (!r.ok || r.config.type !== "number_trick_stepper") throw new Error(r.ok ? "wrong type" : r.error);
  return r.config;
}

describe("counting", () => {
  it("counts 204 squares on a chessboard", () => expect(countSquares(8)).toBe(204));
  it("counts 14 squares on a 3x3 board", () => expect(countSquares(3)).toBe(14));
  it("counts 49 2x2 squares on a chessboard", () => expect(squaresOfSize(8, 2)).toBe(49));
  it("counts 45 handshakes for 10 people", () => expect(handshakes(10)).toBe(45));
  it("counts 435 handshakes for 30 people", () => expect(handshakes(30)).toBe(435));
  it("rejects negative counts", () => expect(() => handshakes(-1)).toThrow(RangeError));
  it("keys unordered pairs", () => expect(pairKey(7, 2)).toBe(pairKey(2, 7)));
});

describe("mulberry32", () => {
  it("is reproducible for a seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("stays in [0, 1) and covers a die fairly", () => {
    const rng = mulberry32(1);
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 6000; i++) counts[randomInt(rng, 0, 5)]++;
    for (const c of counts) expect(c).toBeGreaterThan(850);
  });
});

describe("runTrick", () => {
  const t1089 = trick(SAMPLE_SCENE_CONFIGS.number_trick_stepper);
  it.each([532, 321, 981, 301, 714, 902])("1089 trick: %i -> 1089", (n) => {
    expect(checkTrickInput(n, t1089).ok).toBe(true);
    expect(runTrick(n, t1089).final).toBe(1089);
  });
  it("shows the 99-multiple middle step", () => {
    const run = runTrick(532, t1089);
    expect(run.steps.map((s) => s.after)).toEqual([297, 1089]);
  });
  it("rejects 1089 inputs whose ends differ by < 2", () => {
    expect(checkTrickInput(121, t1089)).toEqual({ ok: false, reason: "constraint" });
    expect(checkTrickInput(98, t1089)).toEqual({ ok: false, reason: "out_of_range" });
  });

  const five = trick(TRICK_SAMPLES.mindReadingFive);
  it.each([1, 7, 42, 100])("mind-reading: %i -> 5", (n) => expect(runTrick(n, five).final).toBe(5));
  it("traces the mind-reading algebra", () => {
    expect(linearTrace(five.steps)?.map((f) => formatLinear(f))).toEqual(["x", "2x", "2x + 10", "x + 5", "5"]);
    expect(linearTrace(t1089.steps)).toBeNull();
  });

  const nine = trick(TRICK_SAMPLES.scrambleNine);
  it("scramble-minus is always divisible by 9", () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 200; i++) {
      const n = randomTrickInput(nine, rng)!;
      const run = runTrick(n, nine, { rng });
      expect(run.final % 9).toBe(0);
      expect(run.steps[0].operand).not.toBeUndefined();
    }
  });

  const kaprekar = trick(TRICK_SAMPLES.kaprekar);
  it.each([3524, 1112, 2111, 1000, 9998, 6174])("Kaprekar: %i -> 6174 within 7 rounds", (n) => {
    const run = runTrick(n, kaprekar);
    expect(run.final).toBe(6174);
    expect(run.fixedPointReached).toBe(true);
    expect(run.loopsToFixed).toBeLessThanOrEqual(7);
  });
  it("Kaprekar: every 4-digit non-repdigit settles at 6174 within 7 rounds", () => {
    let worst = 0;
    for (let n = 1000; n <= 9999; n++) {
      if (!checkTrickInput(n, kaprekar).ok) continue;
      const run = runTrick(n, kaprekar);
      expect(run.final).toBe(6174);
      worst = Math.max(worst, run.loopsToFixed ?? 99);
    }
    expect(worst).toBe(7);
  });
  it("Kaprekar 3524 takes 3 rounds", () => {
    expect(runTrick(3524, kaprekar).loopsToFixed).toBe(3);
  });
  it("formats steps with their arithmetic", () => {
    const show = (n: number, c: NumberTrickStepperConfig) => runTrick(n, c).steps.map((s) => formatTrickStep(s, n, trickWidth(n, c)));
    expect(show(532, t1089)).toEqual(["532 − 235 = 297", "297 + 792 = 1089"]);
    expect(show(7, five)).toEqual(["7 × 2 = 14", "14 + 10 = 24", "24 ÷ 2 = 12", "12 − 7 = 5"]);
    expect(show(2111, kaprekar).slice(0, 2)).toEqual(["2111 − 1112 = 0999", "9990 − 0999 = 8991"]);
  });
  it("pads reverses to the input width", () => expect(reverseNumber(99, 3)).toBe(990));
});

describe("monty hall", () => {
  it("switching wins about 2/3 of 2000 seeded rounds", () => {
    const s = simulateMonty(3, 2000, "switch", 12345);
    const rate = s.switchWins / s.switchGames;
    expect(s.switchGames).toBe(2000);
    expect(rate).toBeGreaterThan(0.6);
    expect(rate).toBeLessThan(0.72);
  });
  it("staying wins about 1/3", () => {
    const s = simulateMonty(3, 2000, "stay", 54321);
    expect(s.stayWins / s.stayGames).toBeGreaterThan(0.28);
    expect(s.stayWins / s.stayGames).toBeLessThan(0.39);
  });
  it("is reproducible for a seed", () => {
    expect(simulateMonty(3, 50, "switch", 5)).toEqual(simulateMonty(3, 50, "switch", 5));
  });
  it("host never opens the pick or the prize", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 500; i++) {
      const r = playMontyRound(10, "switch", rng);
      expect(r.opened).toHaveLength(8);
      expect(r.opened).not.toContain(r.firstPick);
      expect(r.opened).not.toContain(r.prize);
      expect(r.win).toBe(r.firstPick !== r.prize);
    }
  });
  it("offers the prize door whenever the first pick is wrong", () => {
    expect(hostOpens(3, 2, 0, mulberry32(1))).toEqual({ opened: [1], offered: 2 });
  });
  it("knows the odds", () => expect(montyOdds(100)).toEqual({ stay: 0.01, switch: 0.99 }));
});
