/** Pure helpers for tiling_lab (B9): regular polygons around one vertex, and floor patches. */

export const TILE_SHAPES = ["triangle", "square", "pentagon", "hexagon", "octagon"] as const;
export type TileShape = (typeof TILE_SHAPES)[number];

export const SHAPE_SIDES: Record<TileShape, number> = { triangle: 3, square: 4, pentagon: 5, hexagon: 6, octagon: 8 };

/** Interior angle of a regular n-gon in degrees: 180(n − 2)/n (pentagon 108°). */
export function interiorAngle(n: number): number {
  if (!Number.isInteger(n) || n < 3) throw new RangeError(`a polygon needs at least 3 sides, got ${n}`);
  return (180 * (n - 2)) / n;
}

/** Does the regular n-gon tile the plane on its own? Only when its angle divides 360° (n = 3, 4, 6). */
export function tilesAlone(n: number): boolean {
  const a = interiorAngle(n);
  return Math.abs(360 / a - Math.round(360 / a)) < 1e-9;
}

/** How many copies fit around a point, and the gap left (pentagon: 3 copies, 36° gap). */
export function vertexFit(n: number): { count: number; gap: number } {
  const a = interiorAngle(n);
  const count = Math.floor(360 / a + 1e-9);
  return { count, gap: Math.round((360 - count * a) * 1e6) / 1e6 };
}

/** Sum of the interior angles of the given polygons (by side count). */
export function angleSum(sides: readonly number[]): number {
  return Math.round(sides.reduce((s, n) => s + interiorAngle(n), 0) * 1e6) / 1e6;
}

export type VertexStatus = "open" | "closed" | "overlap" | "stuck";

/**
 * State of a vertex surrounded by `sides` (in order): closed at exactly 360°, overlap beyond,
 * stuck when the gap is smaller than every angle on offer, otherwise open.
 */
export function vertexStatus(sides: readonly number[], available: readonly number[]): VertexStatus {
  const s = angleSum(sides);
  if (Math.abs(s - 360) < 1e-6) return "closed";
  if (s > 360) return "overlap";
  const gap = 360 - s;
  return available.some((n) => interiorAngle(n) <= gap + 1e-6) ? "open" : "stuck";
}

/** Multisets of the given side counts (non-decreasing) whose angles add up to exactly 360°. */
export function vertexCombos(sides: readonly number[]): number[][] {
  const opts = [...new Set(sides)].sort((a, b) => a - b);
  const out: number[][] = [];
  const walk = (start: number, acc: number[], sum: number) => {
    if (Math.abs(sum - 360) < 1e-6) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < opts.length; i++) {
      const a = interiorAngle(opts[i]);
      if (sum + a <= 360 + 1e-6) walk(i, [...acc, opts[i]], sum + a);
    }
  };
  walk(0, [], 0);
  return out;
}

export interface Pt {
  x: number;
  y: number;
}

/**
 * Vertices of a regular n-gon with side `s` that has one corner at `c` and its two edges at
 * angles `startDeg` and `startDeg + interiorAngle(n)` (counter-clockwise, maths axes: y up).
 */
export function polygonAtVertex(n: number, startDeg: number, s: number, c: Pt = { x: 0, y: 0 }): Pt[] {
  const ext = 360 / n;
  const pts: Pt[] = [{ ...c }];
  let p = c;
  for (let k = 0; k < n - 1; k++) {
    const t = ((startDeg + k * ext) * Math.PI) / 180;
    p = { x: p.x + s * Math.cos(t), y: p.y + s * Math.sin(t) };
    pts.push(p);
  }
  return pts;
}

/** Regular n-gon centred at `c` with side `s`, first corner at angle `rotDeg` (maths axes). */
export function regularPolygon(n: number, s: number, c: Pt, rotDeg = 0): Pt[] {
  const r = s / (2 * Math.sin(Math.PI / n));
  return Array.from({ length: n }, (_, k) => {
    const t = ((rotDeg + (k * 360) / n) * Math.PI) / 180;
    return { x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) };
  });
}

/**
 * A patch of floor tiled by one shape (3, 4, 6) or by octagons + squares (8): polygons with
 * side `s` around the origin, `rings` deep. Used by the "tile the floor" view and the reveal.
 */
export function floorPatch(n: 3 | 4 | 6 | 8, rings: number, s: number): Array<{ sides: number; pts: Pt[] }> {
  const out: Array<{ sides: number; pts: Pt[] }> = [];
  const R = Math.max(1, rings);
  if (n === 4) {
    for (let i = -R; i < R; i++) for (let j = -R; j < R; j++) out.push({ sides: 4, pts: regularPolygon(4, s, { x: (i + 0.5) * s, y: (j + 0.5) * s }, 45) });
  } else if (n === 3) {
    const h = (s * Math.sqrt(3)) / 2;
    for (let j = -R; j < R; j++) {
      for (let i = -2 * R; i < 2 * R; i++) {
        const x0 = (i + (j % 2 === 0 ? 0 : 0.5)) * s;
        const y0 = j * h;
        out.push({ sides: 3, pts: [{ x: x0, y: y0 }, { x: x0 + s, y: y0 }, { x: x0 + s / 2, y: y0 + h }] });
        out.push({ sides: 3, pts: [{ x: x0 + s / 2, y: y0 + h }, { x: x0 + s, y: y0 }, { x: x0 + 1.5 * s, y: y0 + h }] });
      }
    }
  } else if (n === 6) {
    const w = Math.sqrt(3) * s;
    for (let q = -R; q <= R; q++) {
      for (let r = -R; r <= R; r++) {
        if (Math.abs(q + r) > R) continue;
        out.push({ sides: 6, pts: regularPolygon(6, s, { x: w * (q + r / 2), y: 1.5 * s * r }, 30) });
      }
    }
  } else {
    // Truncated square tiling: octagons on a grid of pitch s(1 + √2), squares in the holes.
    const pitch = s * (1 + Math.SQRT2);
    for (let i = -R; i <= R; i++) {
      for (let j = -R; j <= R; j++) {
        out.push({ sides: 8, pts: regularPolygon(8, s, { x: i * pitch, y: j * pitch }, 22.5) });
        out.push({ sides: 4, pts: regularPolygon(4, s, { x: (i + 0.5) * pitch, y: (j + 0.5) * pitch }, 0) });
      }
    }
  }
  return out;
}
