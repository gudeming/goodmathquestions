/** Pure helpers for bridges_trace (B7 and any one-stroke puzzle): a multigraph walked edge by edge. */

export interface GraphLike {
  nodes: ReadonlyArray<{ id: string }>;
  edges: ReadonlyArray<readonly [string, string]>;
}

/** Number of edge ends at each node (parallel edges count separately). */
export function degrees(g: GraphLike): Record<string, number> {
  const d: Record<string, number> = Object.fromEntries(g.nodes.map((n) => [n.id, 0]));
  for (const [a, b] of g.edges) {
    d[a] = (d[a] ?? 0) + 1;
    d[b] = (d[b] ?? 0) + 1;
  }
  return d;
}

export function oddDegreeNodes(g: GraphLike): string[] {
  const d = degrees(g);
  return g.nodes.map((n) => n.id).filter((id) => d[id] % 2 === 1);
}

/** Are all nodes that touch an edge in one piece? */
export function isEdgeConnected(g: GraphLike): boolean {
  const adj = new Map<string, string[]>();
  for (const [a, b] of g.edges) {
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }
  const touched = [...adj.keys()];
  if (touched.length === 0) return true;
  const seen = new Set([touched[0]]);
  const stack = [touched[0]];
  while (stack.length) {
    for (const m of adj.get(stack.pop() as string) ?? []) {
      if (!seen.has(m)) {
        seen.add(m);
        stack.push(m);
      }
    }
  }
  return seen.size === touched.length;
}

/** Euler's rule: a walk using every edge once exists iff the graph is connected and has 0 or 2 odd nodes. */
export function hasEulerPath(g: GraphLike): boolean {
  if (g.edges.length === 0) return false;
  const odd = oddDegreeNodes(g).length;
  return isEdgeConnected(g) && (odd === 0 || odd === 2);
}

/** Edges (by index) that touch `node` and aren't used yet. */
export function openEdgesAt(g: GraphLike, node: string, used: ReadonlySet<number>): number[] {
  return g.edges.flatMap(([a, b], i) => (!used.has(i) && (a === node || b === node) ? [i] : []));
}

/** Other end of edge `i` seen from `node`. */
export function otherEnd(g: GraphLike, i: number, node: string): string {
  const [a, b] = g.edges[i];
  return a === node ? b : a;
}

/** One Euler walk as { start, edges } (Hierholzer), or null when none exists. */
export function eulerPath(g: GraphLike): { start: string; edges: number[] } | null {
  if (!hasEulerPath(g)) return null;
  const odd = oddDegreeNodes(g);
  const start = odd[0] ?? g.edges[0][0];
  const used = new Set<number>();
  // Iterative Hierholzer on (node, edge-used-to-arrive) pairs.
  const stack: Array<{ node: string; via: number | null }> = [{ node: start, via: null }];
  const out: number[] = [];
  while (stack.length) {
    const top = stack[stack.length - 1];
    const next = openEdgesAt(g, top.node, used)[0];
    if (next === undefined) {
      stack.pop();
      if (top.via !== null) out.push(top.via);
    } else {
      used.add(next);
      stack.push({ node: otherEnd(g, next, top.node), via: next });
    }
  }
  return { start, edges: out.reverse() };
}

/** Check a walk: it must start at `start`, follow adjacent unused edges, and cover every edge once. */
export function isValidEulerWalk(g: GraphLike, start: string, walk: readonly number[]): boolean {
  if (walk.length !== g.edges.length) return false;
  const used = new Set<number>();
  let at = start;
  for (const i of walk) {
    if (used.has(i) || !openEdgesAt(g, at, used).includes(i)) return false;
    used.add(i);
    at = otherEnd(g, i, at);
  }
  return true;
}

/** The seven bridges of Königsberg: north bank, south bank, Kneiphof island, east island. */
export const KONIGSBERG = {
  nodes: [
    { id: "north", x: 50, y: 12, label: { en: "North bank", zh: "北岸" } },
    { id: "south", x: 50, y: 88, label: { en: "South bank", zh: "南岸" } },
    { id: "island", x: 38, y: 50, label: { en: "Island", zh: "小岛" } },
    { id: "east", x: 82, y: 50, label: { en: "East island", zh: "东岛" } },
  ],
  edges: [
    ["north", "island"],
    ["north", "island"],
    ["south", "island"],
    ["south", "island"],
    ["north", "east"],
    ["south", "east"],
    ["island", "east"],
  ] as Array<[string, string]>,
};
