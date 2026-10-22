import { describe, expect, it } from "vitest";
import { angleSum, floorPatch, interiorAngle, polygonAtVertex, tilesAlone, vertexCombos, vertexFit, vertexStatus } from "./tiling";
import { MUTILATED_8, areAdjacent, cellColour, colourBalance, dominoTiling, dominoTilingPossibleByColour } from "./domino";
import { collisions, cycleYears, diagonalSums, enumeratePaths, gcd, lcm, pascalRow, pascalTriangle, rowSum, staircaseWays } from "./sequences";
import { centreRule, daysInMonth, firstWeekday, monthGrid, symmetricPairs, validWindows, windowAround, windowCells, windowSum } from "./calendar";
import { applyFrogMove, frogMinMoves, frogMoveFrom, frogSolution, initialPads, isFrogDeadEnd, isFrogSolved, isLegalFrogMove, legalFrogMoves } from "./frogs";
import { applyJugAction, isJugsSolved, jugsLedger, jugsReachable, jugsShortestSolution, jugsTimeline } from "./jugs";
import { attackedSquares, clashingQueens, colsFromQueens, isQueensSolution, mirrorCols, mirrorKey, queensFromCols, queensSolutions } from "./queens";
import { binarySearchPath, binarySearchSteps, halvingStrip, middleGuess, narrow, replyTo } from "./guess";
import { literalNumbers, literalOps, sameNumbers, tilesToExpression, type ExprTile } from "./expression";
import { dealCoins, randomPick, splitAndFlip } from "./coin-piles";
import { flyLegs, flyTotal, meetingTime, trainsAt } from "./trains";

describe("tiling", () => {
  it("interior angles: 60, 90, 108, 120, 135", () => expect([3, 4, 5, 6, 8].map(interiorAngle)).toEqual([60, 90, 108, 120, 135]));
  it("only 3, 4, 6 tile alone", () => expect([3, 4, 5, 6, 8].map(tilesAlone)).toEqual([true, true, false, true, false]));
  it("pentagons: three fit with a 36° gap; four overlap by 72°", () => {
    expect(vertexFit(5)).toEqual({ count: 3, gap: 36 });
    expect(angleSum([5, 5, 5, 5]) - 360).toBe(72);
  });
  it("vertex status", () => {
    expect(vertexStatus([6, 6, 6], [6])).toBe("closed");
    expect(vertexStatus([5, 5, 5], [5])).toBe("stuck");
    expect(vertexStatus([5, 5, 5], [3, 5])).toBe("stuck"); // a 36° gap is too small even for a triangle
    expect(vertexStatus([4, 4, 4], [3, 4])).toBe("open");
    expect(vertexStatus([5, 5, 5, 5], [5])).toBe("overlap");
    expect(vertexStatus([8, 8, 4], [4, 8])).toBe("closed");
  });
  it("octagon + octagon + square is a vertex", () => expect(vertexCombos([4, 8])).toContainEqual([4, 8, 8]));
  it("polygon at a vertex closes up with the right angle", () => {
    const pts = polygonAtVertex(5, 0, 10);
    expect(pts).toHaveLength(5);
    const last = pts[4];
    expect(Math.hypot(last.x, last.y)).toBeCloseTo(10, 9);
    expect((Math.atan2(last.y, last.x) * 180) / Math.PI).toBeCloseTo(108, 9);
  });
  it("floor patches are non-empty", () => {
    for (const n of [3, 4, 6, 8] as const) expect(floorPatch(n, 2, 10).length).toBeGreaterThan(4);
  });
});

describe("domino", () => {
  it("corners (0,0) and (7,7) are both black", () => expect([cellColour(0, 0), cellColour(7, 7)]).toEqual(["black", "black"]));
  it("the mutilated board has 30 black and 32 white", () => expect(colourBalance(MUTILATED_8)).toEqual({ black: 30, white: 32 }));
  it("so the colour argument rules it out, and no tiling exists", () => {
    expect(dominoTilingPossibleByColour(MUTILATED_8)).toBe(false);
    expect(dominoTiling(MUTILATED_8)).toBeNull();
  });
  it("one black + one white removed: a tiling exists (Gomory)", () => {
    const t = dominoTiling({ size: 8, removed: [[0, 0], [3, 4]] });
    expect(t).toHaveLength(31);
    expect(t?.every(([a, b]) => areAdjacent(a, b))).toBe(true);
  });
  it("balanced but disconnected boards can still be impossible", () => {
    // 2 × 2 with the two whites removed: black cells (0,0) and (1,1) are not neighbours.
    expect(dominoTiling({ size: 2, removed: [[0, 1], [1, 0]] })).toBeNull();
    expect(dominoTiling({ size: 2, removed: [] })).toHaveLength(2);
  });
});

describe("staircase", () => {
  it("1, 1, 2, 3, 5, 8, … 89", () => expect(Array.from({ length: 11 }, (_, n) => staircaseWays(n))).toEqual([1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]));
  it("staircaseWays(10) = 89", () => expect(staircaseWays(10)).toBe(89));
  it("hops up to 3: 274 ways for 10", () => expect(staircaseWays(10, 3)).toBe(274));
  it("enumerates and agrees with the count", () => {
    expect(enumeratePaths(3)).toEqual([[1, 1, 1], [1, 2], [2, 1]]);
    for (let n = 1; n <= 6; n++) for (const h of [2, 3]) expect(enumeratePaths(n, h)).toHaveLength(staircaseWays(n, h));
  });
});

describe("pascal", () => {
  it("row 4 is 1 4 6 4 1", () => expect(pascalRow(4)).toEqual([1, 4, 6, 4, 1]));
  it("rowSum(10) = 1024 and every row doubles", () => {
    expect(rowSum(10)).toBe(1024);
    for (let n = 0; n <= 12; n++) expect(rowSum(n)).toBe(2 ** n);
  });
  it("each cell is the sum of the two above", () => {
    const t = pascalTriangle(12);
    for (let r = 1; r <= 12; r++) for (let c = 1; c < r; c++) expect(t[r][c]).toBe(t[r - 1][c - 1] + t[r - 1][c]);
  });
  it("shallow diagonals add up to Fibonacci", () => expect(diagonalSums(10)).toEqual([1, 1, 2, 3, 5, 8, 13, 21, 34, 55]));
});

describe("cycles", () => {
  it("lcm(13, 6) = 78, lcm(12, 6) = 12, lcm(17, 6) = 102", () => expect([lcm(13, 6), lcm(12, 6), lcm(17, 6)]).toEqual([78, 12, 102]));
  it("gcd", () => expect([gcd(12, 18), gcd(13, 6), gcd(0, 5)]).toEqual([6, 1, 5]));
  it("collisions within 120 years", () => {
    expect(collisions(13, 6, 120)).toEqual([78]);
    expect(collisions(12, 6, 120)).toEqual([12, 24, 36, 48, 60, 72, 84, 96, 108, 120]);
    expect(cycleYears(13, 40)).toEqual([13, 26, 39]);
  });
});

describe("calendar", () => {
  it("knows month lengths and weekdays", () => {
    expect([daysInMonth(2024, 2), daysInMonth(2026, 2), daysInMonth(2026, 11)]).toEqual([29, 28, 30]);
    expect(firstWeekday(2026, 11)).toBe(0); // 1 Nov 2026 is a Sunday
  });
  it("November 2026: 17 is a Tuesday with a full window, nine-sum 153", () => {
    const g = monthGrid(2026, 11);
    const at = windowAround(g, 17);
    expect(at).toEqual([1, 1]);
    expect(windowCells(g, 1, 1)).toEqual([9, 10, 11, 16, 17, 18, 23, 24, 25]);
    expect(windowSum(g, 1, 1)).toBe(153);
    expect(centreRule(17)).toBe(153);
  });
  it("every valid window obeys the rule", () => {
    for (const [y, m] of [[2026, 11], [2025, 2], [2024, 6]] as const) {
      const g = monthGrid(y, m);
      for (const [r, c] of validWindows(g)) expect(windowSum(g, r, c)).toBe(centreRule(g[r + 1][c + 1] as number));
    }
  });
  it("windows off the dates are null", () => {
    const g = monthGrid();
    expect(g[0][0]).toBe(1);
    expect(windowSum(g, 3, 5)).toBeNull(); // includes blanks after 31
    expect(windowAround(g, 1)).toBeNull();
  });
  it("opposite pairs add up to twice the centre", () => {
    const cells = windowCells(monthGrid(2026, 11), 1, 1) as number[];
    for (const [i, j] of symmetricPairs()) expect(cells[i] + cells[j]).toBe(34);
  });
});

describe("frogs", () => {
  it("frogMinMoves(3) = 15, n(n + 2)", () => expect([1, 2, 3, 4].map(frogMinMoves)).toEqual([3, 8, 15, 24]));
  it("BFS agrees with n(n + 2) and the solution is legal", () => {
    for (let n = 1; n <= 4; n++) {
      const sol = frogSolution(n);
      expect(sol).toHaveLength(frogMinMoves(n));
      let pads = initialPads(n);
      for (const m of sol) {
        expect(isLegalFrogMove(pads, m)).toBe(true);
        pads = applyFrogMove(pads, m);
      }
      expect(isFrogSolved(pads)).toBe(true);
    }
  });
  it("frogs only go forward, stepping or jumping one frog", () => {
    const p = initialPads(3); // G G G _ B B B
    expect(frogMoveFrom(p, 2)).toEqual({ from: 2, to: 3 });
    expect(frogMoveFrom(p, 1)).toEqual({ from: 1, to: 3 }); // jumping a frog of either colour is allowed
    expect(frogMoveFrom(p, 0)).toEqual(null);
    expect(frogMoveFrom(p, 4)).toEqual({ from: 4, to: 3 });
    expect(frogMoveFrom(p, 5)).toEqual({ from: 5, to: 3 });
    expect(legalFrogMoves(p)).toHaveLength(4);
  });
  it("two same-colour frogs blocking: a dead end", () => {
    expect(isFrogDeadEnd(["G", "B", "B", "G", null] as never)).toBe(false);
    expect(isFrogDeadEnd(["B", "G", "G", "B", null, "B", "G"] as never)).toBe(false);
    expect(isFrogDeadEnd(["G", "G", "B", "B", null] as never)).toBe(true);
  });
});

describe("water jugs", () => {
  const cfg = { jugs: [3, 5] as const, target: 4 };
  it("3 & 5 → 4 takes six steps", () => expect(jugsShortestSolution(cfg)?.length).toBe(6));
  it("the solution really ends with 4 litres", () => {
    const sol = jugsShortestSolution(cfg)!;
    const states = jugsTimeline(sol, cfg.jugs);
    expect(isJugsSolved(states[states.length - 1], 4)).toBe(true);
  });
  it("the ledger adds up: +5 +5 −3 −3 = 4", () => {
    const { terms, result } = jugsLedger(jugsShortestSolution(cfg)!, cfg);
    expect(result).toBe(4);
    expect([...terms].sort((a, b) => a - b)).toEqual([-3, -3, 5, 5]);
  });
  it("pouring stops when the other jug is full", () => expect(applyJugAction([0, 5], { kind: "pour", from: 1, to: 0 }, [3, 5])).toEqual([3, 2]));
  it("gcd rule: 4 & 6 can't make 5", () => {
    expect(jugsReachable({ jugs: [4, 6], target: 5 })).toBe(false);
    expect(jugsShortestSolution({ jugs: [4, 6], target: 5 })).toBeNull();
    for (let t = 1; t <= 5; t++) expect(jugsShortestSolution({ jugs: [3, 5], target: t })).not.toBeNull();
  });
});

describe("queens", () => {
  it("4 → 2, 5 → 10, 6 → 4, 8 → 92", () => expect([4, 5, 6, 8].map((n) => queensSolutions(n).length)).toEqual([2, 10, 4, 92]));
  it("the two 4 × 4 solutions are mirror images", () => {
    const [a, b] = queensSolutions(4);
    expect(mirrorCols(a)).toEqual(b);
    expect(mirrorKey(a)).toBe(mirrorKey(b));
  });
  it("every solution checks out", () => {
    for (const s of queensSolutions(6)) expect(isQueensSolution(queensFromCols(s), 6)).toBe(true);
  });
  it("attack lines and clashes", () => {
    expect(attackedSquares([[0, 0]], 4).size).toBe(9);
    expect(clashingQueens([[0, 0], [2, 2], [1, 4]])).toEqual(new Set([0, 1]));
    expect(colsFromQueens([[0, 1], [1, 3], [2, 0], [3, 2]], 4)).toEqual([1, 3, 0, 2]);
    expect(colsFromQueens([[0, 1], [0, 3]], 2)).toBeNull();
  });
});

describe("guess", () => {
  it("binarySearchSteps: 100 → 7, 1000 → 10, 127 → 7, 128 → 8", () => expect([100, 1000, 127, 128, 1].map(binarySearchSteps)).toEqual([7, 10, 7, 8, 1]));
  it("the halving strip for 100", () => expect(halvingStrip(100)).toEqual([100, 50, 25, 13, 7, 4, 2, 1]));
  it("binary search never needs more than the bound", () => {
    for (const max of [10, 100, 128]) for (let s = 1; s <= max; s++) expect(binarySearchPath(s, max).length).toBeLessThanOrEqual(binarySearchSteps(max));
    expect(Math.max(...Array.from({ length: 100 }, (_, i) => binarySearchPath(i + 1, 100).length))).toBe(7);
  });
  it("replies and narrowing", () => {
    expect([replyTo(37, 50), replyTo(37, 20), replyTo(37, 37)]).toEqual(["lower", "higher", "correct"]);
    expect(narrow(1, 100, 50, "lower")).toEqual([1, 49]);
    expect(narrow(1, 49, 25, "higher")).toEqual([26, 49]);
    expect(middleGuess(1, 100)).toBe(50);
  });
});

describe("expression tiles", () => {
  const four = (index: number): ExprTile => ({ kind: "num", value: 4, index });
  const tiles: ExprTile[] = [four(0), four(1), { kind: "op", op: "/" }, four(2), { kind: "op", op: "-" }, four(3)];
  it("glues adjacent digits only with concat", () => {
    expect(tilesToExpression(tiles, true)).toBe("44/4-4");
    expect(tilesToExpression(tiles, false)).toBe("4 4/4-4");
    expect(tilesToExpression(tiles, true, true)).toBe("44 ÷ 4 − 4");
  });
  it("reads literals like the evaluator", () => {
    expect(literalNumbers("44/4-4", true)).toEqual([4, 4, 4, 4]);
    expect(literalNumbers("44/4-4", false)).toEqual([44, 4, 4]);
    expect(literalOps("4!/4+√4", false).sort()).toEqual(["!", "+", "/", "sqrt"]);
    expect(literalOps("44 ÷ 4 − 4", true).sort()).toEqual(["-", "/", "concat"]);
    expect(sameNumbers([4, 4, 4, 4], [4, 4, 4, 4])).toBe(true);
    expect(sameNumbers([4, 4, 4], [4, 4, 4, 4])).toBe(false);
  });
});

describe("coin piles", () => {
  it("deals exactly the heads, reproducibly", () => {
    const a = dealCoins(100, 10, 7);
    expect(a.filter(Boolean)).toHaveLength(10);
    expect(dealCoins(100, 10, 7)).toEqual(a);
  });
  it("split 10 and flip: equal heads, every time", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const faces = dealCoins(100, 10, seed);
      const r = splitAndFlip(faces, randomPick(100, 10, seed * 31));
      expect(r.leftHeads).toBe(r.rightHeadsAfterFlip);
      expect(r.leftHeads).toBe(10 - r.k);
    }
  });
  it("randomPick returns distinct indices", () => expect(new Set(randomPick(100, 10, 3)).size).toBe(10));
});

describe("trains", () => {
  const c = { distanceKm: 100, trainSpeed: 50, flySpeed: 75 };
  it("meetingTime(100, 50) = 1 and the fly flies 75 km", () => {
    expect(meetingTime(100, 50)).toBe(1);
    expect(flyTotal(c)).toBe(75);
  });
  it("legs shrink by (75 − 50)/(75 + 50) = 1/5: 60, 12, 2.4, …", () => {
    const legs = flyLegs(4, c);
    expect(legs.map((l) => l.km)).toEqual([60, 12, 2.4, 0.48].map((x) => expect.closeTo(x, 9)));
    expect(legs.map((l) => l.from)).toEqual(["A", "B", "A", "B"]);
    expect(flyLegs(60, c).reduce((s, l) => s + l.km, 0)).toBeCloseTo(75, 9);
  });
  it("positions over time", () => {
    expect(trainsAt(0, c)).toMatchObject({ a: 0, b: 100, fly: 0, flown: 0, legsDone: 0 });
    const mid = trainsAt(0.8, c); // the fly reaches train B at 0.8 h, 60 km out
    expect(mid.fly).toBeCloseTo(60, 9);
    expect(mid.b).toBeCloseTo(60, 9);
    expect(trainsAt(0.5, c)).toMatchObject({ a: 25, b: 75, flown: 37.5 });
    expect(trainsAt(0.5, c).fly).toBeCloseTo(37.5, 9);
    expect(trainsAt(1, c)).toMatchObject({ a: 50, b: 50, fly: 50, flown: 75 });
  });
});
