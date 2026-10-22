import { describe, expect, it } from "vitest";
import { mulberry32 } from "./random";
import { foldsToReach, grainsOnSquare, groupDigits, log10Digits, scientific, thicknessAfter, totalGrains, worldRiceYears } from "./doubling";
import { diceTrial, expectedRollsUntil, modeSums, productParity, simulateDice, sumCounts, sumDistribution, targetHitProbability } from "./dice";
import { birthdayThreshold, pAnyPair, pMatchMe, randomRoom, simulateBirthdays } from "./birthday";
import { applyHanoiMove, initialHanoi, isHanoiSolved, isLegalMove, minMoves, optimalSequence, type HanoiState } from "./hanoi";
import { WOLF_GOAT_CABBAGE, canCross, crossRiver, initialRiverState, isRiverStateValid, riverConflicts, riverTimeline, shortestSolution } from "./river";
import { areaFor, bestWidth, lengthFor, maxArea } from "./fence";
import { colorGroup, countAtStep, extrapolateCells, formatRule, formatRuleAt, patternCentre, sameShape, type Cell } from "./pattern";
import { centreCuts, countPizzaRegions, lazyCaterer, lineToChord, optimalCuts, pizzaFaces, type Chord } from "./pizza";
import { balancedTernary, contiguousReach, minWeighings, placeHeavy, splitThree, weighBalls, weighWeights, weighableSet, weighingFor } from "./balance";

describe("chessboard doubling", () => {
  it("square 21 holds 2^20 grains", () => expect(grainsOnSquare(21)).toBe("1048576"));
  it("square 64 holds 2^63 exactly", () => expect(grainsOnSquare(64)).toBe("9223372036854775808"));
  it("the whole board holds 2^64 - 1", () => expect(totalGrains(64)).toBe("18446744073709551615"));
  it("scales by the start amount", () => expect([grainsOnSquare(3, 5), totalGrains(3, 5)]).toEqual(["20", "35"]));
  it("rejects square 0", () => expect(() => grainsOnSquare(0)).toThrow(RangeError));
  it("groups digits", () => expect(groupDigits("1048576")).toBe("1,048,576"));
  it("estimates log10 beyond 2^53", () => expect(log10Digits(totalGrains(64))).toBeCloseTo(19.266, 2));
  it("prints scientific form", () => expect(scientific(totalGrains(64))).toBe("1.8 × 10^19"));
  it("the board is about 1,500 years of world rice", () => {
    const years = worldRiceYears(totalGrains(64));
    expect(years).toBeGreaterThan(1000);
    expect(years).toBeLessThan(2000);
  });
});

describe("fold paper", () => {
  it("10 folds of 0.1 mm = 102.4 mm", () => expect(thicknessAfter(10)).toBeCloseTo(102.4, 9));
  it("0 folds is the sheet", () => expect(thicknessAfter(0)).toBe(0.1));
  it("42 folds pass the Moon (384,400 km)", () => expect(thicknessAfter(42)).toBeGreaterThan(384_400_000_000));
  it("41 folds don't", () => expect(thicknessAfter(41)).toBeLessThan(384_400_000_000));
  it("folds to reach the Moon is 42", () => expect(foldsToReach(384_400_000_000)).toBe(42));
  it("folds to reach exactly 102.4 mm is 10", () => expect(foldsToReach(102.4)).toBe(10));
  it("rejects negative folds", () => expect(() => thicknessAfter(-1)).toThrow(RangeError));
});

describe("dice", () => {
  it("two dice: 7 has 6 of 36 ways", () => expect(sumDistribution(2)[7]).toBeCloseTo(6 / 36, 12));
  it("two dice: 2 and 12 have one way each", () => expect([sumCounts(2)[2], sumCounts(2)[12]]).toEqual([1, 1]));
  it("distributions sum to 1", () => expect(sumDistribution(3).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12));
  it("modes: 7 for two dice, 10 and 11 for three", () => expect([modeSums(2), modeSums(3)]).toEqual([[7], [10, 11]]));
  it("product parity for two dice is 27:9", () => {
    const p = productParity(2);
    expect(p.even).toBeCloseTo(27 / 36, 12);
    expect([p.evenOutcomes, p.oddOutcomes]).toEqual([27, 9]);
  });
  it("expected rolls until a 1/6 event is 6", () => expect(expectedRollsUntil(1 / 6)).toBeCloseTo(6, 12));
  it("rejects p = 0", () => expect(() => expectedRollsUntil(0)).toThrow(RangeError));
  it("hit probability with 2 dice is 11/36", () => expect(targetHitProbability(2)).toBeCloseTo(11 / 36, 12));
  it("seeded simulation is reproducible", () => expect(simulateDice(mulberry32(4), "sum", 2, 50)).toEqual(simulateDice(mulberry32(4), "sum", 2, 50)));
  it("until-six mean of 3000 rounds is near 6", () => {
    const v = simulateDice(mulberry32(11), "until_target", 1, 3000, 6);
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    expect(mean).toBeGreaterThan(5.5);
    expect(mean).toBeLessThan(6.5);
  });
  it("a trial's faces explain its value", () => {
    const rng = mulberry32(2);
    for (let i = 0; i < 100; i++) {
      const t = diceTrial(rng, "product", 2);
      expect(t.value).toBe(t.faces[0] * t.faces[1]);
      const u = diceTrial(rng, "until_target", 1, 6);
      expect(u.faces).toEqual([6]);
    }
  });
});

describe("birthdays", () => {
  it("pAnyPair(23) ~ 0.507", () => expect(pAnyPair(23)).toBeCloseTo(0.507, 3));
  it("pAnyPair(22) < 0.5", () => expect(pAnyPair(22)).toBeLessThan(0.5));
  it("pAnyPair(57) > 0.99", () => expect(pAnyPair(57)).toBeGreaterThan(0.99));
  it("pMatchMe(253) ~ 0.500", () => expect(pMatchMe(253)).toBeCloseTo(0.5, 2));
  it("thresholds are 23 and 253", () => expect([birthdayThreshold("any_pair"), birthdayThreshold("match_me")]).toEqual([23, 253]));
  it("366 people always share", () => expect(pAnyPair(366)).toBe(1));
  it("simulated 23-person rooms match about half the time", () => {
    const r = simulateBirthdays(mulberry32(7), "any_pair", 23, 2000);
    expect(r.rate).toBeGreaterThan(0.45);
    expect(r.rate).toBeLessThan(0.56);
  });
  it("a match_me pair always includes me and really matches", () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 200; i++) {
      const room = randomRoom(rng, "match_me", 300);
      expect(room.birthdays).toHaveLength(301);
      if (room.pair) {
        expect(room.pair[0]).toBe(0);
        expect(room.birthdays[room.pair[1]]).toBe(room.birthdays[0]);
      }
    }
  });
  it("is reproducible for a seed", () => expect(simulateBirthdays(mulberry32(1), "any_pair", 30, 50)).toEqual(simulateBirthdays(mulberry32(1), "any_pair", 30, 50)));
});

describe("tower of hanoi", () => {
  it("minMoves(4) = 15", () => expect(minMoves(4)).toBe(15));
  it.each([1, 2, 3, 4, 5, 6, 7, 8])("the optimal sequence for %i discs is legal, minimal and solves it", (n) => {
    const moves = optimalSequence(n);
    expect(moves).toHaveLength(minMoves(n));
    let s: HanoiState = initialHanoi(n);
    for (const [a, b] of moves) {
      expect(isLegalMove(s, a, b)).toBe(true);
      s = applyHanoiMove(s, a, b);
    }
    expect(s[2]).toEqual(initialHanoi(n)[0]);
    expect(isHanoiSolved(s, n)).toBe(true);
  });
  it("rejects a big disc on a small one", () => {
    const s = applyHanoiMove(initialHanoi(3), 0, 2); // disc 1 on peg 2
    expect(isLegalMove(s, 0, 2)).toBe(false); // disc 2 onto disc 1
    expect(() => applyHanoiMove(s, 0, 2)).toThrow();
  });
  it("rejects moving from an empty peg or onto itself", () => {
    expect(isLegalMove(initialHanoi(3), 1, 2)).toBe(false);
    expect(isLegalMove(initialHanoi(3), 0, 0)).toBe(false);
  });
  it("the start position is not solved", () => expect(isHanoiSolved(initialHanoi(3), 3)).toBe(false));
});

describe("river crossing", () => {
  const wgc = WOLF_GOAT_CABBAGE;
  it("wolf/goat/cabbage takes 7 crossings", () => expect(shortestSolution(wgc)?.length).toBe(7));
  it("the solution starts and ends with the goat", () => {
    const s = shortestSolution(wgc)!;
    expect(s[0].carry).toEqual(["goat"]);
    expect(s[6].carry).toEqual(["goat"]);
  });
  it("every state along the solution is safe", () => {
    for (const st of riverTimeline(shortestSolution(wgc)!)) expect(isRiverStateValid(st, wgc)).toBe(true);
  });
  it("taking the wolf first leaves goat with cabbage", () => {
    const s = crossRiver(initialRiverState(), ["wolf"]);
    expect(riverConflicts(s, wgc)).toEqual([["goat", "cabbage"]]);
  });
  it("can't carry items from the other bank or over capacity", () => {
    expect(canCross(initialRiverState(), ["goat", "wolf"], wgc)).toBe(false);
    expect(canCross(crossRiver(initialRiverState(), ["goat"]), ["wolf"], wgc)).toBe(false);
  });
  it("a triangle of conflicts with a one-seat boat is unsolvable", () => {
    expect(shortestSolution({ ...wgc, conflicts: [...wgc.conflicts, ["wolf", "cabbage"]] })).toBeNull();
  });
  it("no conflicts: 2k - 1 crossings", () => expect(shortestSolution({ ...wgc, conflicts: [] })?.length).toBe(5));
  it("a two-seat boat with four items", () => {
    const items = [...wgc.items, { id: "bug", emoji: "🐛", label: { en: "bug", zh: "虫" } }];
    const s = shortestSolution({ items, conflicts: [...wgc.conflicts, ["bug", "cabbage"]], boatCapacity: 2 });
    expect(s).not.toBeNull();
  });
});

describe("fence", () => {
  it("24 m: best width 6, area 36", () => {
    expect(bestWidth({ perimeter: 24 })).toBe(6);
    expect(maxArea({ perimeter: 24 })).toBe(36);
  });
  it("against a wall: 6 x 12 = 72", () => {
    const c = { perimeter: 24, wallSide: true };
    expect(bestWidth(c)).toBe(6);
    expect(lengthFor(6, c)).toBe(12);
    expect(maxArea(c)).toBe(72);
  });
  it("11 x 1 is only 11", () => expect(areaFor(1, { perimeter: 24 })).toBe(11));
  it("non-integer best width when allowed", () => expect(bestWidth({ perimeter: 26, integerOnly: false })).toBe(6.5));
  it("integer best width rounds to the better neighbour", () => expect(maxArea({ perimeter: 26 })).toBe(42));
  it("width outside the range has no area", () => expect(areaFor(12, { perimeter: 24 })).toBe(0));
});

describe("visual pattern", () => {
  const plus = (n: number): Cell[] => {
    const out: Cell[] = [[0, 0]];
    for (let k = 1; k <= n; k++) out.push([k, 0], [-k, 0], [0, k], [0, -k]);
    return out;
  };
  it("4n + 1 at step 10 is 41", () => expect(countAtStep({ kind: "linear", a: 4, b: 1 }, 10)).toBe(41));
  it("quadratic rule", () => expect(countAtStep({ kind: "quadratic", a: 1, b: 2, c: 1 }, 3)).toBe(16));
  it("formats rules", () => {
    expect(formatRule({ kind: "linear", a: 4, b: 1 })).toBe("4n + 1");
    expect(formatRule({ kind: "quadratic", a: 1, b: 0, c: -1 })).toBe("n² − 1");
    expect(formatRuleAt({ kind: "linear", a: 4, b: 1 }, 10)).toBe("4 × 10 + 1 = 41");
    expect(formatRuleAt({ kind: "quadratic", a: 1, b: 2, c: 1 }, 3)).toBe("3² + 2 × 3 + 1 = 16");
  });
  it("extends a plus sign to step 10 with 41 cells", () => {
    const cells = extrapolateCells([plus(1), plus(2), plus(3)], 10)!;
    expect(cells).toHaveLength(41);
    expect(sameShape(cells, plus(10))).toBe(true);
  });
  it("can't extend a growing square by translation", () => {
    const sq = (n: number): Cell[] => Array.from({ length: n * n }, (_, i) => [i % n, Math.floor(i / n)] as const);
    expect(extrapolateCells([sq(1), sq(2), sq(3)], 4)).toBeNull();
  });
  it("compares shapes up to translation", () => {
    expect(sameShape([[0, 0], [1, 0]], [[5, 5], [6, 5]])).toBe(true);
    expect(sameShape([[0, 0], [1, 0]], [[0, 0], [0, 1]])).toBe(false);
  });
  it("arm colouring: centre plus four arms; ring colouring: layers", () => {
    const c = patternCentre(plus(1));
    const arms = new Set(plus(3).map((cell) => colorGroup(cell, c, "arm")));
    expect(arms.size).toBe(5);
    expect(plus(3).filter((cell) => colorGroup(cell, c, "ring") === 2)).toHaveLength(4);
  });
});

describe("pizza cuts", () => {
  it("lazy caterer: 1, 2, 4, 7, 11, 16, 22", () => expect([0, 1, 2, 3, 4, 5, 6].map(lazyCaterer)).toEqual([1, 2, 4, 7, 11, 16, 22]));
  it("lazyCaterer(4) = 11", () => expect(lazyCaterer(4)).toBe(11));
  it.each([1, 2, 3, 4, 5, 6])("optimal arrangement of %i cuts reaches the lazy caterer number", (n) => {
    expect(countPizzaRegions(optimalCuts(n))).toBe(lazyCaterer(n));
    expect(pizzaFaces(optimalCuts(n))).toHaveLength(lazyCaterer(n));
  });
  it.each([1, 2, 3, 4, 5, 6])("%i cuts through the centre make 2n pieces", (n) => {
    expect(countPizzaRegions(centreCuts(n))).toBe(2 * n);
    expect(pizzaFaces(centreCuts(n))).toHaveLength(2 * n);
  });
  it("parallel cuts make n + 1 pieces", () => {
    const parallel: Chord[] = [-0.5, 0, 0.5].map((x) => ({ a1: Math.acos(x), a2: -Math.acos(x) }));
    expect(countPizzaRegions(parallel)).toBe(4);
    expect(pizzaFaces(parallel)).toHaveLength(4);
  });
  it("three cuts through one off-centre point make 6", () => {
    const p = [0.3, 0.2] as const;
    const cuts = [0, 1, 2].map((i) => lineToChord(p, [p[0] + Math.cos(i), p[1] + Math.sin(i)])!);
    expect(countPizzaRegions(cuts)).toBe(6);
    expect(pizzaFaces(cuts)).toHaveLength(6);
  });
  it("duplicate and degenerate cuts don't add pieces", () => {
    const [c] = optimalCuts(1);
    expect(countPizzaRegions([c, c, { a1: c.a2, a2: c.a1 }, { a1: 1, a2: 1 }])).toBe(2);
  });
  it("cuts that only meet at the crust don't cross", () => {
    expect(countPizzaRegions([{ a1: 0, a2: 2 }, { a1: 2, a2: 4 }])).toBe(3);
  });
  it("faces agree with the count on random cuts", () => {
    const rng = mulberry32(17);
    for (let t = 0; t < 120; t++) {
      const cuts = Array.from({ length: 1 + (t % 6) }, () => ({ a1: rng() * 7, a2: rng() * 7 }));
      expect(pizzaFaces(cuts).length).toBe(countPizzaRegions(cuts));
    }
  });
  it("a line that misses the pizza is no cut", () => expect(lineToChord([2, 2], [3, 2])).toBeNull());
  it("a dragged line through the centre is a diameter", () => {
    const c = lineToChord([-2, 0], [2, 0])!;
    expect(Math.abs(Math.abs(c.a1 - c.a2) - Math.PI)).toBeLessThan(1e-9);
  });
});

describe("balance", () => {
  it("1, 3, 9, 27 on two pans weigh every whole weight up to 40", () => {
    const set = weighableSet([1, 3, 9, 27]);
    expect(Math.max(...set)).toBe(40);
    expect(set).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    expect(contiguousReach([1, 3, 9, 27])).toBe(40);
  });
  it("one pan: 1, 2, 4, 8 reach 15", () => expect(contiguousReach([1, 2, 4, 8], false)).toBe(15));
  it("one pan: 1, 3, 9, 27 has gaps", () => expect(contiguousReach([1, 3, 9, 27], false)).toBe(1));
  it("weighs 5 as 9 opposite, 3 + 1 beside", () => {
    const w = weighingFor(5, [1, 3, 9, 27])!;
    expect(w.opposite.reduce((a, b) => a + b, 0) - w.beside.reduce((a, b) => a + b, 0)).toBe(5);
    expect(weighWeights(5, w.beside, w.opposite)).toBe("balanced");
  });
  it("41 is impossible", () => expect(weighingFor(41, [1, 3, 9, 27])).toBeNull());
  it("balanced ternary of 5 is 9 - 3 - 1", () => expect(balancedTernary(5)).toEqual([-1, -1, 1]));
  it.each([
    [3, 1],
    [9, 2],
    [10, 3],
    [27, 3],
    [1, 0],
  ])("minWeighings(%i) = %i", (items, k) => expect(minWeighings(items)).toBe(k));
  it("the heavy pan goes down", () => {
    expect(weighBalls([0, 1, 2], [3, 4, 5], 4)).toBe("right");
    expect(weighBalls([0, 1, 2], [3, 4, 5], 7)).toBe("balanced");
    expect(weighBalls([0, 1], [3], 9)).toBe("left");
  });
  it("splits 9 as 3-3-3", () => expect(splitThree([0, 1, 2, 3, 4, 5, 6, 7, 8]).map((g) => g.length)).toEqual([3, 3, 3]));
  it("3-3-3 finds the heavy ball in 2 weighings for every position", () => {
    for (let heavy = 0; heavy < 9; heavy++) {
      let cand = Array.from({ length: 9 }, (_, i) => i);
      let used = 0;
      while (cand.length > 1) {
        const [l, r, off] = splitThree(cand);
        const tilt = weighBalls(l, r, heavy);
        cand = tilt === "left" ? l : tilt === "right" ? r : off;
        used++;
      }
      expect(cand).toEqual([heavy]);
      expect(used).toBe(2);
    }
  });
  it("seeded heavy placement is reproducible and in range", () => {
    const a = placeHeavy(mulberry32(5), 9);
    expect(a).toBe(placeHeavy(mulberry32(5), 9));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(9);
  });
});
