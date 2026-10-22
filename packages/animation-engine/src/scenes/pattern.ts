/** Pure helpers for visual_pattern (E3): a dot pattern whose count follows an explicit rule. */

export type Cell = readonly [number, number];
export type PatternRule = { kind: "linear"; a: number; b: number } | { kind: "quadratic"; a: number; b: number; c: number };

/** Dots at step n (1-based). countAtStep({ kind: "linear", a: 4, b: 1 }, 10) = 41. */
export function countAtStep(rule: PatternRule, n: number): number {
  return rule.kind === "linear" ? rule.a * n + rule.b : rule.a * n * n + rule.b * n + rule.c;
}

/** "4n + 1" / "n² + 2n + 1" (with `n` as the variable). */
export function formatRule(rule: PatternRule, variable = "n"): string {
  const terms: Array<[number, string]> =
    rule.kind === "linear"
      ? [
          [rule.a, variable],
          [rule.b, ""],
        ]
      : [
          [rule.a, `${variable}²`],
          [rule.b, variable],
          [rule.c, ""],
        ];
  let out = "";
  for (const [coef, v] of terms) {
    if (coef === 0) continue;
    const abs = Math.abs(coef);
    const body = v ? `${abs === 1 ? "" : abs}${v}` : String(abs);
    out += out === "" ? (coef < 0 ? `−${body}` : body) : coef < 0 ? ` − ${body}` : ` + ${body}`;
  }
  return out || "0";
}

export const cellKey = (c: Cell) => `${c[0]},${c[1]}`;

export function bounds(cells: readonly Cell[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of cells) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

/** Translate cells so the bounding box starts at (0, 0) and sort them: shape identity up to translation. */
export function normalizeShape(cells: readonly Cell[]): string[] {
  if (cells.length === 0) return [];
  const { minX, minY } = bounds(cells);
  return cells.map(([x, y]) => `${x - minX},${y - minY}`).sort();
}

export function sameShape(a: readonly Cell[], b: readonly Cell[]): boolean {
  const na = normalizeShape(a);
  const nb = normalizeShape(b);
  return na.length === nb.length && na.every((k, i) => k === nb[i]);
}

/**
 * Extend a pattern geometrically when it grows by translating its newest cells: the cells
 * added between the last two given steps each move by a fixed offset every step (plus signs,
 * L shapes, staircases of arms). Returns null when the given steps don't grow that way
 * (e.g. squares), so callers fall back to a compact dot block.
 */
export function extrapolateCells(steps: ReadonlyArray<readonly Cell[]>, n: number): Cell[] | null {
  if (n <= steps.length) return [...steps[n - 1]];
  if (steps.length < 3) return null;
  const k = steps.length;
  const added = (i: number) => {
    const prev = new Set(steps[i - 1].map(cellKey));
    return steps[i].filter((c) => !prev.has(cellKey(c)));
  };
  const last = added(k - 1);
  const before = added(k - 2);
  if (last.length === 0 || last.length !== before.length) return null;
  // Each newest cell pairs with its nearest cell from the previous growth ring; the pairing
  // must be one-to-one, otherwise the growth isn't a plain translation.
  const used = new Set<number>();
  const offsets: Array<readonly [number, number]> = [];
  for (const [x, y] of last) {
    let best = -1;
    let bestD = Infinity;
    before.forEach((c, i) => {
      const d = (c[0] - x) ** 2 + (c[1] - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (used.has(best)) return null;
    used.add(best);
    offsets.push([x - before[best][0], y - before[best][1]]);
  }
  const cells: Cell[] = [...steps[k - 1]];
  const seen = new Set(cells.map(cellKey));
  let front: Cell[] = last;
  for (let s = k + 1; s <= n; s++) {
    front = front.map((c, i) => [c[0] + offsets[i][0], c[1] + offsets[i][1]] as const);
    for (const c of front) {
      if (!seen.has(cellKey(c))) {
        seen.add(cellKey(c));
        cells.push(c);
      }
    }
  }
  return cells;
}

/** Centre of the first step (the "seed" of the pattern), rounded to a cell. */
export function patternCentre(first: readonly Cell[]): Cell {
  const b = bounds(first);
  return [Math.round((b.minX + b.maxX) / 2), Math.round((b.minY + b.maxY) / 2)];
}

/**
 * Colour groups for the two ways of seeing a growing pattern:
 * - "arm":  0 for the centre cell, otherwise 1..8 by direction from the centre (the arms).
 * - "ring": the layer (Chebyshev distance from the centre): 0, 1, 2, ...
 * - "none": everything 0.
 */
export function colorGroup(cell: Cell, centre: Cell, mode: "arm" | "ring" | "none"): number {
  const dx = cell[0] - centre[0];
  const dy = cell[1] - centre[1];
  if (mode === "none") return 0;
  if (mode === "ring") return Math.max(Math.abs(dx), Math.abs(dy));
  if (dx === 0 && dy === 0) return 0;
  const angle = Math.atan2(dy, dx);
  return 1 + (((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8);
}

/** The rule with n substituted: "4 × 10 + 1 = 41" / "1 × 3² + 2 × 3 + 1 = 16". */
export function formatRuleAt(rule: PatternRule, n: number): string {
  const terms: Array<[number, string]> =
    rule.kind === "linear"
      ? [
          [rule.a, `${n}`],
          [rule.b, ""],
        ]
      : [
          [rule.a, `${n}²`],
          [rule.b, `${n}`],
          [rule.c, ""],
        ];
  let out = "";
  for (const [coef, v] of terms) {
    if (coef === 0) continue;
    const abs = Math.abs(coef);
    const body = v ? (abs === 1 ? v : `${abs} × ${v}`) : String(abs);
    out += out === "" ? (coef < 0 ? `−${body}` : body) : coef < 0 ? ` − ${body}` : ` + ${body}`;
  }
  return `${out || "0"} = ${countAtStep(rule, n)}`;
}
