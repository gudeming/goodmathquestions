import { describe, expect, it } from "vitest";
import { mulberry32 } from "./random";
import { applyLadderStep, ladderFor, ladderValues, roundForLadder, scaleAnswer, secondsIn } from "./scale";
import { partialSum, partialSumFraction, ratioDenominator, remainingAfter, seriesLimit, smallerThan, stepsToShrinkBelow } from "./halving";
import { biggestThatFits, DEFAULT_PLANETS, extraForGap, ropeGap, ropeGapFor } from "./circle-rope";
import { angleAt, integerHypotenuse, rightTriangle, squareOnSide, squaresBounds, tileMoves, triangleSquares, type Vec } from "./pythagoras";
import { KONIGSBERG, degrees, eulerPath, hasEulerPath, isEdgeConnected, isValidEulerWalk, oddDegreeNodes, openEdgesAt } from "./bridges";
import { LAP_MINUTES, crossedOverlaps, formatClock, handAngles, handGap, minutesForDrag, overlapTimes } from "./clock";
import { EMPTY_COIN_STATE, addFlip, collectAfterStreak, expectedFlipsForStreak, flipUntilStreak, streakProbability } from "./coins";
import { pairsIn, socksToGuarantee, worstCaseSequence, worstSock } from "./socks";
import { convergence, isInsideCircle, piEstimate, simulatePi, throwDarts } from "./pi-darts";
import {
  aliquotSum,
  classify,
  collatzPath,
  collatzPeak,
  collatzSteps,
  fibonacci,
  fibRatios,
  fibSquares,
  GOLDEN_RATIO,
  longestCollatz,
  perfectNumbersUpTo,
  properDivisors,
  sunflowerSeeds,
  timesElevenSteps,
} from "./number-play";

describe("scale ladder", () => {
  it("a million seconds is about 11.6 days", () => expect(scaleAnswer("time", 1_000_000)).toBeCloseTo(11.574, 3));
  it("a billion seconds is about 31.7 years", () => expect(ladderValues(1e9, ladderFor("time"))[4]).toBeCloseTo(31.71, 2));
  it("the time chain is ÷60 ÷60 ÷24 ÷365", () => expect(ladderFor("time").steps.map((s) => `${s.op}${s.factor}`)).toEqual(["div60", "div60", "div24", "div365"]));
  it("70 beats a minute reach a billion at about 27 years", () => {
    const years = scaleAnswer("heartbeats", 70, 1e9);
    expect(years).toBeGreaterThan(27);
    expect(years).toBeLessThan(27.5);
  });
  it("heartbeat chain: 70 → 4,200 → 100,800 → 36,792,000 a year", () =>
    expect(ladderValues(70, ladderFor("heartbeats", 1e9)).slice(0, 4)).toEqual([70, 4200, 100_800, 36_792_000]));
  it("a googol is 10^20 times the atoms", () => expect(scaleAnswer("powers", 80, 100)).toBe(20));
  it("`into` divides the total by the value", () => expect(applyLadderStep(4, { op: "into", factor: 100 })).toBe(25));
  it("converts a school day into hours", () => expect(secondsIn(2, 23_400)).toBe(6.5));
  it("rounds for display", () => expect([roundForLadder(16_666.67), roundForLadder(11.574), roundForLadder(0.0317)]).toEqual([16_667, 11.6, 0.0317]));
});

describe("halving bar", () => {
  it("1/2 + … + 1/2^20 > 0.999999", () => expect(partialSum(20, 2)).toBeGreaterThan(0.999999));
  it("never quite reaches 1 in finitely many steps", () => expect(partialSum(20, 2)).toBeLessThan(1));
  it("exact fractions: 7/8 after three halves, 13/27 after three thirds", () => expect([partialSumFraction(3, 2), partialSumFraction(3, 3)]).toEqual([[7, 8], [13, 27]]));
  it("fractions agree with the decimals", () => {
    for (const d of [2, 3] as const) for (let n = 1; n <= 20; n++) expect(partialSumFraction(n, d)[0] / partialSumFraction(n, d)[1]).toBeCloseTo(partialSum(n, d), 12);
  });
  it("limits: halves → 1, thirds → 1/2", () => expect([seriesLimit(2), seriesLimit(3)]).toEqual([1, 0.5]));
  it("accepts 0.5 and 1/3 only", () => expect([ratioDenominator(0.5), ratioDenominator(1 / 3), ratioDenominator(0.25)]).toEqual([2, 3, null]));
  it("after 20 halves less than a bacterium is left; an atom needs 34", () => {
    expect(smallerThan(remainingAfter(20, 2))?.en).toBe("a bacterium");
    expect(stepsToShrinkBelow(1e-10)).toBe(34);
  });
});

describe("circle rope", () => {
  it("1 m of extra rope lifts it about 0.159 m", () => expect(ropeGap(1)).toBeCloseTo(0.159, 3));
  it("the planet's size cancels out", () => {
    for (const p of DEFAULT_PLANETS) expect(ropeGapFor(p.radiusM, 1)).toBeCloseTo(ropeGap(1), p.radiusM > 1e8 ? 5 : 9);
  });
  it("a cat fits under 1 m extra; a car needs about 9.4 m", () => {
    expect(biggestThatFits(ropeGap(1))?.id).toBe("cat");
    expect(extraForGap(1.5)).toBeCloseTo(9.42, 2);
  });
  it("nothing fits under no extra rope", () => expect(biggestThatFits(0)).toBeNull());
});

describe("pythagoras squares", () => {
  it("6-8-10 and 5-12-13 are triples; 6-7 is not", () => expect([integerHypotenuse(6, 8), integerHypotenuse(5, 12), integerHypotenuse(6, 7)]).toEqual([10, 13, null]));
  it("areas: 36 + 64 = 100", () => {
    const s = triangleSquares(rightTriangle(6, 8));
    expect([s.areaA, s.areaB, s.areaC]).toEqual([36, 64, 100]);
    expect(s.angle).toBeCloseTo(90, 9);
  });
  it("an obtuse corner makes c² bigger than a² + b²", () => {
    const s = triangleSquares({ o: [0, 0], pb: [8, 0], pa: [-2, 6] });
    expect(s.angle).toBeGreaterThan(90);
    expect(s.areaC).toBeGreaterThan(s.areaA + s.areaB);
  });
  it("squares stand outside the triangle", () => {
    const sq = squareOnSide([0, 0], [8, 0], [0, 6]);
    expect(sq.corners[2][1]).toBe(-8);
  });
  it("angleAt measures a right angle", () => expect(angleAt([0, 0], [1, 0], [0, 1])).toBeCloseTo(90, 9));
  it("bounds cover all three squares", () => expect(squaresBounds(rightTriangle(6, 8))).toEqual([-6, -8, 14, 14]));
  it("tile moves: 100 tiles fill 100 distinct slots of the big square", () => {
    const moves = tileMoves(6, 8);
    expect(moves.length).toBe(100);
    const key = (p: Vec) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`;
    expect(new Set(moves.map((m) => key(m.to[0]))).size).toBe(100);
    expect(moves.filter((m) => m.source === "a").length).toBe(36);
  });
  it("refuses a non-triple", () => expect(() => tileMoves(2, 3)).toThrow(RangeError));
});

describe("bridges", () => {
  it("Königsberg has four odd lands and no Euler walk", () => {
    expect(oddDegreeNodes(KONIGSBERG).sort()).toEqual(["east", "island", "north", "south"]);
    expect(hasEulerPath(KONIGSBERG)).toBe(false);
    expect(eulerPath(KONIGSBERG)).toBeNull();
  });
  it("degrees are 3, 3, 5, 3", () => expect(degrees(KONIGSBERG)).toEqual({ north: 3, south: 3, island: 5, east: 3 }));
  it("removing one bridge makes it walkable, and the walk found is valid", () => {
    const g = { ...KONIGSBERG, edges: KONIGSBERG.edges.slice(1) };
    expect(hasEulerPath(g)).toBe(true);
    const walk = eulerPath(g);
    expect(walk).not.toBeNull();
    expect(isValidEulerWalk(g, walk!.start, walk!.edges)).toBe(true);
    expect(oddDegreeNodes(g)).toContain(walk!.start);
  });
  it("a square with a diagonal starts at an odd corner", () => {
    const g = { nodes: ["a", "b", "c", "d"].map((id) => ({ id })), edges: [["a", "b"], ["b", "c"], ["c", "d"], ["d", "a"], ["a", "c"]] as Array<[string, string]> };
    const w = eulerPath(g);
    expect(w && ["a", "c"].includes(w.start) && isValidEulerWalk(g, w.start, w.edges)).toBe(true);
  });
  it("a disconnected graph has no walk", () => {
    const g = { nodes: ["a", "b", "c", "d"].map((id) => ({ id })), edges: [["a", "b"], ["c", "d"]] as Array<[string, string]> };
    expect([isEdgeConnected(g), hasEulerPath(g)]).toEqual([false, false]);
  });
  it("rejects invalid walks", () => expect(isValidEulerWalk(KONIGSBERG, "north", [0, 0, 1, 2, 3, 4, 5])).toBe(false));
  it("lists open edges at a node", () => expect(openEdgesAt(KONIGSBERG, "north", new Set([0]))).toEqual([1, 4]));
});

describe("clock overlaps", () => {
  it("22 overlaps a day, 11 in 12 hours", () => expect([overlapTimes().length, overlapTimes(12).length]).toEqual([22, 11]));
  it("they are 720/11 minutes apart and the hands really meet", () => {
    const t = overlapTimes();
    t.forEach((v, i) => {
      expect(v).toBeCloseTo(i * LAP_MINUTES, 9);
      expect(handGap(v)).toBeLessThan(1e-6);
    });
  });
  it("no overlap between 11 and 12 o'clock", () => expect(overlapTimes(12).filter((v) => v > 660 && v < 720)).toEqual([]));
  it("hand angles at 3:00", () => expect(handAngles(180)).toEqual({ minute: 0, hour: 90 }));
  it("crossing detection works both ways", () => {
    expect(crossedOverlaps(60, 70)).toEqual([1]);
    expect(crossedOverlaps(70, 60)).toEqual([1]);
    expect(crossedOverlaps(0, 140)).toEqual([1, 2]);
    expect(crossedOverlaps(10, 20)).toEqual([]);
  });
  it("drag unwrapping goes the short way past 12", () => expect([minutesForDrag(354, 6), minutesForDrag(6, 354)]).toEqual([2, -2]));
  it("formats times", () => {
    expect(formatClock(overlapTimes()[1], "en")).toBe("1:05:27 am");
    expect(formatClock(720, "en")).toBe("12:00 pm");
    expect(formatClock(13 * 60 + 5, "zh")).toBe("下午 1:05");
  });
});

describe("coin flips", () => {
  it("ten heads in a row is 1/1024", () => expect(streakProbability(10)).toBe(1 / 1024));
  it("expects 2046 flips for a 10-streak", () => expect(expectedFlipsForStreak(10)).toBe(2046));
  it("flipping until a streak ends on the streak", () => {
    const { state, used } = flipUntilStreak(EMPTY_COIN_STATE, mulberry32(1), 10);
    expect(state.run).toBe(10);
    expect(state.flips).toBe(used);
    expect(state.recent.slice(-10)).toEqual(Array(10).fill("H"));
    expect(state.streaks).toBe(1);
  });
  it("is reproducible with a seed", () => expect(flipUntilStreak(EMPTY_COIN_STATE, mulberry32(9), 8).used).toBe(flipUntilStreak(EMPTY_COIN_STATE, mulberry32(9), 8).used));
  it("only flips after a streak are tallied", () => {
    let s = EMPTY_COIN_STATE;
    for (const f of ["H", "H", "T", "H", "H", "H"] as const) s = addFlip(s, f, 2);
    expect([s.afterHeads, s.afterTails, s.longest, s.streaks]).toEqual([1, 1, 3, 2]);
  });
  it("the flip after a 10-streak stays near 50/50", () => {
    const s = collectAfterStreak(EMPTY_COIN_STATE, mulberry32(42), 10, 400);
    expect(s.afterHeads + s.afterTails).toBe(400);
    expect(s.afterHeads / 400).toBeGreaterThan(0.42);
    expect(s.afterHeads / 400).toBeLessThan(0.58);
  });
});

describe("sock drawer", () => {
  it("three colours: 4 socks guarantee a pair, 6 guarantee two", () => expect([socksToGuarantee(3), socksToGuarantee(3, 2), socksToGuarantee(5)]).toEqual([4, 6, 6]));
  it("worst luck needs exactly that many", () => {
    for (const c of [3, 4, 5]) for (const p of [1, 2]) expect(worstCaseSequence(c, p).length).toBe(socksToGuarantee(c, p));
  });
  it("worst luck avoids a pair while it can", () => expect(worstSock([0, 1], 3)).toBe(2));
  it("counts pairs", () => expect(pairsIn([0, 0, 0, 1, 1, 2], 3)).toBe(2));
});

describe("pi darts", () => {
  it("5000 seeded darts land within 0.1 of π", () => expect(Math.abs(simulatePi(mulberry32(314), 5000) - Math.PI)).toBeLessThan(0.1));
  it("throwDarts agrees with simulatePi for the same seed", () => {
    const darts = throwDarts(mulberry32(7), 1000);
    expect(piEstimate(darts.filter((d) => d.inside).length, 1000)).toBe(simulatePi(mulberry32(7), 1000));
  });
  it("the centre is inside, a corner is not", () => expect([isInsideCircle(0.5, 0.5), isInsideCircle(0.01, 0.01)]).toEqual([true, false]));
  it("convergence ends at the final estimate", () => {
    const darts = throwDarts(mulberry32(3), 500);
    const c = convergence(darts);
    expect(c[c.length - 1][0]).toBe(500);
    expect(c[c.length - 1][1]).toBe(piEstimate(darts.filter((d) => d.inside).length, 500));
  });
  it("no estimate before the first dart", () => expect(piEstimate(0, 0)).toBeNaN());
});

describe("collatz", () => {
  it("9 takes 19 steps; 27 takes 111", () => expect([collatzSteps(9), collatzSteps(27)]).toEqual([19, 111]));
  it("6 → 3 → 10 → 5 → 16 → 8 → 4 → 2 → 1", () => expect(collatzPath(6)).toEqual([6, 3, 10, 5, 16, 8, 4, 2, 1]));
  it("27 peaks at 9232", () => expect(collatzPeak(27)).toBe(9232));
  it("9 is the longest of 1..9; 18 beats it below 20", () => {
    expect(longestCollatz(1, 9)).toBe(9);
    expect(collatzSteps(18)).toBe(20);
  });
  it("1 takes no steps", () => expect(collatzSteps(1)).toBe(0));
  it("rejects 0", () => expect(() => collatzPath(0)).toThrow(RangeError));
});

describe("times eleven", () => {
  it("85 × 11 ends in 935 with a carry", () => {
    const s = timesElevenSteps(85);
    expect(s[s.length - 1]).toEqual({ kind: "result", value: 935 });
    expect(s.map((x) => x.kind)).toEqual(["split", "sum", "carry", "result"]);
  });
  it("72 × 11 = 792 without a carry", () => expect(timesElevenSteps(72).at(-1)).toEqual({ kind: "result", value: 792 }));
  it("agrees with × 11 for every two-digit number", () => {
    for (let n = 10; n <= 99; n++) expect(timesElevenSteps(n).at(-1)).toEqual({ kind: "result", value: n * 11 });
  });
  it("rejects three digits", () => expect(() => timesElevenSteps(100)).toThrow(RangeError));
});

describe("fibonacci", () => {
  it("first ten terms end in 55", () => expect(fibonacci(10)).toEqual([1, 1, 2, 3, 5, 8, 13, 21, 34, 55]));
  it("ratios approach the golden ratio", () => expect(Math.abs(fibRatios(14).at(-1)! - GOLDEN_RATIO)).toBeLessThan(1e-4));
  it("squares tile without overlapping and the spiral is continuous", () => {
    const sq = fibSquares(10);
    const area = sq.reduce((a, q) => a + q.size ** 2, 0);
    const xs = sq.flatMap((q) => [q.x, q.x + q.size]);
    const ys = sq.flatMap((q) => [q.y, q.y + q.size]);
    expect((Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))).toBe(area); // 55 × 89
    for (let i = 1; i < sq.length; i++) expect(sq[i].arc.start).toEqual(sq[i - 1].arc.end);
    for (const q of sq) expect(Math.hypot(q.arc.end[0] - q.arc.start[0], q.arc.end[1] - q.arc.start[1])).toBeCloseTo(q.size * Math.SQRT2, 9);
  });
  it("sunflower seeds stay in the unit disc", () => expect(sunflowerSeeds(200).every(([x, y]) => Math.hypot(x, y) <= 1)).toBe(true));
});

describe("divisors", () => {
  it("28 = 1 + 2 + 4 + 7 + 14", () => {
    expect(properDivisors(28)).toEqual([1, 2, 4, 7, 14]);
    expect(aliquotSum(28)).toBe(28);
  });
  it("12 is abundant, 6 perfect, 7 deficient", () => expect([classify(12), classify(6), classify(7)]).toEqual(["abundant", "perfect", "deficient"]));
  it("perfect numbers up to 500 are 6, 28, 496", () => expect(perfectNumbersUpTo(500)).toEqual([6, 28, 496]));
  it("24 is too rich (36)", () => expect(aliquotSum(24)).toBe(36));
});
