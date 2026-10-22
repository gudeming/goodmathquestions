/**
 * Pure helpers for pizza_cuts (B2). A cut is a chord of the unit circle given by the angles of
 * its two endpoints. Region count by Euler's formula for chord arrangements:
 *   regions = 1 + (distinct chords) + Σ over interior crossing points (chords through it − 1)
 * which gives the lazy caterer number 1 + n + C(n, 2) in general position and 2n when every
 * cut passes through the centre. Faces (for colouring) come from splitting the disc polygon.
 */

export interface Chord {
  a1: number;
  a2: number;
}
export type Point = readonly [number, number];

const EPS = 1e-9;
const MERGE_EPS = 1e-6;
const MIN_FACE_AREA = 1e-15;

/** Max pieces with n straight cuts: 1 + n(n + 1)/2. lazyCaterer(4) = 11. */
export function lazyCaterer(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`cuts must be a non-negative integer, got ${n}`);
  return 1 + (n * (n + 1)) / 2;
}

export function chordEndpoints(c: Chord): [Point, Point] {
  return [
    [Math.cos(c.a1), Math.sin(c.a1)],
    [Math.cos(c.a2), Math.sin(c.a2)],
  ];
}

const norm = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
const angleClose = (a: number, b: number) => {
  const d = Math.abs(norm(a) - norm(b));
  return Math.min(d, 2 * Math.PI - d) < MERGE_EPS;
};

/** Drop degenerate chords (both ends equal) and duplicates (same pair of endpoints). */
export function distinctChords(chords: readonly Chord[]): Chord[] {
  const out: Chord[] = [];
  for (const c of chords) {
    if (angleClose(c.a1, c.a2)) continue;
    const dup = out.some((o) => (angleClose(o.a1, c.a1) && angleClose(o.a2, c.a2)) || (angleClose(o.a1, c.a2) && angleClose(o.a2, c.a1)));
    if (!dup) out.push(c);
  }
  return out;
}

/** Crossing point of two chords strictly inside the disc, or null. */
export function chordIntersection(c: Chord, d: Chord): Point | null {
  const [p1, p2] = chordEndpoints(c);
  const [q1, q2] = chordEndpoints(d);
  const rx = p2[0] - p1[0];
  const ry = p2[1] - p1[1];
  const sx = q2[0] - q1[0];
  const sy = q2[1] - q1[1];
  const denom = rx * sy - ry * sx;
  if (Math.abs(denom) < EPS) return null; // parallel (or the same line)
  const t = ((q1[0] - p1[0]) * sy - (q1[1] - p1[1]) * sx) / denom;
  const u = ((q1[0] - p1[0]) * ry - (q1[1] - p1[1]) * rx) / denom;
  if (t <= MERGE_EPS || t >= 1 - MERGE_EPS || u <= MERGE_EPS || u >= 1 - MERGE_EPS) return null; // touch at the crust only
  return [p1[0] + t * rx, p1[1] + t * ry];
}

/** Interior crossing points with how many chords pass through each. */
export function crossingPoints(chords: readonly Chord[]): Array<{ point: Point; chords: number }> {
  const cs = distinctChords(chords);
  const pts: Array<{ point: Point; members: Set<number> }> = [];
  for (let i = 0; i < cs.length; i++) {
    for (let j = i + 1; j < cs.length; j++) {
      const p = chordIntersection(cs[i], cs[j]);
      if (!p) continue;
      const hit = pts.find((q) => Math.hypot(q.point[0] - p[0], q.point[1] - p[1]) < MERGE_EPS * 10);
      if (hit) hit.members.add(i).add(j);
      else pts.push({ point: p, members: new Set([i, j]) });
    }
  }
  return pts.map((p) => ({ point: p.point, chords: p.members.size }));
}

/** Number of pieces the cuts make. */
export function countPizzaRegions(chords: readonly Chord[]): number {
  const n = distinctChords(chords).length;
  return 1 + n + crossingPoints(chords).reduce((s, p) => s + p.chords - 1, 0);
}

/**
 * The infinite line through two points (in unit-circle coordinates) clipped to the circle,
 * as a chord; null if the line misses the pizza or the points coincide.
 */
export function lineToChord(p: Point, q: Point): Chord | null {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  const ux = dx / len;
  const uy = dy / len;
  // Solve |p + t u| = 1.
  const b = p[0] * ux + p[1] * uy;
  const c = p[0] * p[0] + p[1] * p[1] - 1;
  const disc = b * b - c;
  if (disc <= 1e-6) return null;
  const s = Math.sqrt(disc);
  const t1 = -b - s;
  const t2 = -b + s;
  return { a1: Math.atan2(p[1] + t1 * uy, p[0] + t1 * ux), a2: Math.atan2(p[1] + t2 * uy, p[0] + t2 * ux) };
}

/**
 * n cuts in general position (every pair crosses inside, no three meet): lines tangent to a
 * small inner circle at evenly spread directions over a half-turn. Valid for n <= 6.
 */
export function optimalCuts(n: number, inner = 0.2): Chord[] {
  const half = Math.acos(inner);
  return Array.from({ length: n }, (_, i) => {
    const theta = (i * Math.PI) / n + 0.3;
    return { a1: theta - half, a2: theta + half };
  });
}

/** n cuts all through the centre (diameters): 2n pieces. */
export function centreCuts(n: number): Chord[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i * Math.PI) / n + 0.2;
    return { a1: a, a2: a + Math.PI };
  });
}

/**
 * Convex pieces of the disc (approximated by a `segments`-gon) after all cuts, for drawing.
 * Each piece is a polygon in unit coordinates.
 */
export function pizzaFaces(chords: readonly Chord[], segments = 96): Point[][] {
  const cuts = distinctChords(chords);
  // Chord endpoints are polygon vertices, so even a cut that clips the crust splits exactly.
  // Each chord's short arc also gets a few vertices so a thin cap off the crust has an area.
  const arcPoints = (c: Chord) => {
    const a = norm(c.a1);
    let span = norm(c.a2) - a;
    if (span > Math.PI) span -= 2 * Math.PI;
    if (span < -Math.PI) span += 2 * Math.PI;
    return [0, 0.25, 0.5, 0.75, 1].map((k) => norm(a + k * span));
  };
  const angles = [...Array.from({ length: segments }, (_, i) => (2 * Math.PI * i) / segments), ...cuts.flatMap(arcPoints)].sort((a, b) => a - b);
  let faces: Point[][] = [angles.map((a) => [Math.cos(a), Math.sin(a)] as const)];
  for (const c of cuts) {
    const [p, q] = chordEndpoints(c);
    const nx = q[1] - p[1];
    const ny = p[0] - q[0];
    const side = (pt: Point) => {
      const v = (pt[0] - p[0]) * nx + (pt[1] - p[1]) * ny;
      return Math.abs(v) < 1e-12 ? 0 : v;
    };
    const next: Point[][] = [];
    for (const f of faces) {
      const [a, b] = splitPolygon(f, side);
      if (a.length >= 3 && polygonArea(a) > MIN_FACE_AREA) next.push(a);
      if (b.length >= 3 && polygonArea(b) > MIN_FACE_AREA) next.push(b);
    }
    faces = next;
  }
  return faces;
}

function splitPolygon(poly: readonly Point[], side: (p: Point) => number): [Point[], Point[]] {
  const pos: Point[] = [];
  const neg: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) pos.push(a);
    if (sa <= 0) neg.push(a);
    if ((sa > 0 && sb < 0) || (sa < 0 && sb > 0)) {
      const t = sa / (sa - sb);
      const m: Point = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
      pos.push(m);
      neg.push(m);
    }
  }
  return [pos, neg];
}

export function polygonArea(poly: readonly Point[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
}
