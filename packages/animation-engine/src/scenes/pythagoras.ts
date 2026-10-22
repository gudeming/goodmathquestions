/** Pure helpers for pythagoras_squares (B6): squares on the sides of a triangle, and the unit-tile proof. */

export type Vec = [number, number];

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
const scale = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k];
const len = (a: Vec) => Math.hypot(a[0], a[1]);

export function distance(a: Vec, b: Vec): number {
  return len(sub(a, b));
}

/** Is a² + b² a perfect square? Returns c, or null. */
export function integerHypotenuse(a: number, b: number): number | null {
  const c = Math.round(Math.sqrt(a * a + b * b));
  return c * c === a * a + b * b ? c : null;
}

/** Angle at `at` between the rays to `p` and `q`, in degrees (0..180). */
export function angleAt(at: Vec, p: Vec, q: Vec): number {
  const u = sub(p, at);
  const v = sub(q, at);
  const lu = len(u);
  const lv = len(v);
  if (lu === 0 || lv === 0) return 0;
  const cos = Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (lu * lv)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * The square standing on side u→v, on the side away from `away` (the triangle's third vertex).
 * Returns its corners [u, v, v + n·L, u + n·L] and the unit vectors along the side and outward.
 */
export function squareOnSide(u: Vec, v: Vec, away: Vec): { corners: [Vec, Vec, Vec, Vec]; along: Vec; out: Vec; side: number } {
  const d = sub(v, u);
  const side = len(d);
  const along: Vec = side === 0 ? [1, 0] : scale(d, 1 / side);
  let out: Vec = [-along[1], along[0]];
  const mid = scale(add(u, v), 0.5);
  const toAway = sub(away, mid);
  if (out[0] * toAway[0] + out[1] * toAway[1] > 0) out = scale(out, -1);
  const n = scale(out, side);
  return { corners: [u, v, add(v, n), add(u, n)], along, out, side };
}

/** Corners of unit tile (i, j) in a square of integer side laid on u→v with outward unit `out`. */
export function tileCorners(u: Vec, along: Vec, out: Vec, i: number, j: number): [Vec, Vec, Vec, Vec] {
  const p = add(add(u, scale(along, i)), scale(out, j));
  return [p, add(p, along), add(add(p, along), out), add(p, out)];
}

export interface RightTriangle {
  /** Right-angle corner. */
  o: Vec;
  /** End of leg b (along x). */
  pb: Vec;
  /** End of leg a (along y, upwards in maths coordinates). */
  pa: Vec;
}

/** Standard placement: right angle at the origin, leg b along +x, leg a along +y. */
export function rightTriangle(a: number, b: number): RightTriangle {
  return { o: [0, 0], pb: [b, 0], pa: [0, a] };
}

export interface TriangleSquares {
  sideA: number;
  sideB: number;
  sideC: number;
  areaA: number;
  areaB: number;
  areaC: number;
  angle: number;
}

/** Sides, square areas and the angle at the corner `o` for any triangle o, pb, pa. */
export function triangleSquares(t: RightTriangle): TriangleSquares {
  const sideA = distance(t.o, t.pa);
  const sideB = distance(t.o, t.pb);
  const sideC = distance(t.pa, t.pb);
  return { sideA, sideB, sideC, areaA: sideA ** 2, areaB: sideB ** 2, areaC: sideC ** 2, angle: angleAt(t.o, t.pb, t.pa) };
}

/** Bounding box of the triangle plus its three squares: [minX, minY, maxX, maxY]. */
export function squaresBounds(t: RightTriangle): [number, number, number, number] {
  const pts = [
    ...squareOnSide(t.o, t.pa, t.pb).corners,
    ...squareOnSide(t.o, t.pb, t.pa).corners,
    ...squareOnSide(t.pb, t.pa, t.o).corners,
  ];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/**
 * The reveal's tile moves for an integer right triangle: every unit tile of the two leg squares
 * (a² + b² of them) is assigned a slot in the hypotenuse square (c² slots) — one to one.
 */
export function tileMoves(a: number, b: number): Array<{ from: [Vec, Vec, Vec, Vec]; to: [Vec, Vec, Vec, Vec]; source: "a" | "b" }> {
  const c = integerHypotenuse(a, b);
  if (c === null) throw new RangeError(`${a}² + ${b}² is not a perfect square`);
  const t = rightTriangle(a, b);
  const sqA = squareOnSide(t.o, t.pa, t.pb);
  const sqB = squareOnSide(t.o, t.pb, t.pa);
  const sqC = squareOnSide(t.pb, t.pa, t.o);
  const slots: Array<[Vec, Vec, Vec, Vec]> = [];
  for (let j = 0; j < c; j++) for (let i = 0; i < c; i++) slots.push(tileCorners(sqC.corners[0], sqC.along, sqC.out, i, j));
  const moves: Array<{ from: [Vec, Vec, Vec, Vec]; to: [Vec, Vec, Vec, Vec]; source: "a" | "b" }> = [];
  let k = 0;
  for (const [sq, n, source] of [[sqB, b, "b"], [sqA, a, "a"]] as const) {
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) moves.push({ from: tileCorners(sq.corners[0], sq.along, sq.out, i, j), to: slots[k++], source });
  }
  return moves;
}
