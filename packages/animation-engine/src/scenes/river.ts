/**
 * Pure helpers for river_crossing (F1). The farmer rows the boat; it carries up to
 * `boatCapacity` items besides him. A bank without the farmer must not hold both items of
 * any conflict pair. State: which bank each item is on, plus the farmer's bank.
 */

export type Bank = "left" | "right";

export interface RiverConfigLike {
  items: ReadonlyArray<{ id: string }>;
  conflicts: ReadonlyArray<readonly [string, string]>;
  boatCapacity?: number;
}

export interface RiverState {
  farmer: Bank;
  /** Item ids on the right bank. Everything else is on the left. */
  right: ReadonlySet<string>;
}

export interface RiverMove {
  /** Items in the boat with the farmer (may be empty: he rows alone). */
  carry: string[];
  /** Bank the boat arrives at. */
  to: Bank;
}

/** Hard limit that keeps BFS tiny (2^(items+1) states). */
export const RIVER_MAX_ITEMS = 8;

export function initialRiverState(): RiverState {
  return { farmer: "left", right: new Set() };
}

export function bankOf(state: RiverState, id: string): Bank {
  return state.right.has(id) ? "right" : "left";
}

/** Conflict pairs left alone on a bank (empty = safe). */
export function riverConflicts(state: RiverState, config: RiverConfigLike): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [a, b] of config.conflicts) {
    const side = bankOf(state, a);
    if (side === bankOf(state, b) && side !== state.farmer) out.push([a, b]);
  }
  return out;
}

export function isRiverStateValid(state: RiverState, config: RiverConfigLike): boolean {
  return riverConflicts(state, config).length === 0;
}

export function isRiverSolved(state: RiverState, config: RiverConfigLike): boolean {
  return state.farmer === "right" && config.items.every((it) => state.right.has(it.id));
}

/** Can the farmer make this crossing? (Items must be on his bank, within capacity.) Ignores safety. */
export function canCross(state: RiverState, carry: readonly string[], config: RiverConfigLike): boolean {
  const cap = config.boatCapacity ?? 1;
  if (carry.length > cap || new Set(carry).size !== carry.length) return false;
  const ids = new Set(config.items.map((i) => i.id));
  return carry.every((id) => ids.has(id) && bankOf(state, id) === state.farmer);
}

/** Apply a crossing (no safety check: the scene shows what goes wrong, then undoes). */
export function crossRiver(state: RiverState, carry: readonly string[]): RiverState {
  const to: Bank = state.farmer === "left" ? "right" : "left";
  const right = new Set(state.right);
  for (const id of carry) {
    if (to === "right") right.add(id);
    else right.delete(id);
  }
  return { farmer: to, right };
}

function subsetsUpTo<T>(items: readonly T[], k: number): T[][] {
  const out: T[][] = [[]];
  const go = (start: number, acc: T[]) => {
    for (let i = start; i < items.length; i++) {
      const next = [...acc, items[i]];
      out.push(next);
      if (next.length < k) go(i + 1, next);
    }
  };
  if (k > 0) go(0, []);
  return out;
}

const stateKey = (s: RiverState, ids: readonly string[]) => `${s.farmer}|${ids.map((id) => (s.right.has(id) ? 1 : 0)).join("")}`;

/** BFS: the shortest safe sequence of crossings from everything-left to everything-right, or null if none. */
export function shortestSolution(config: RiverConfigLike, from: RiverState = initialRiverState()): RiverMove[] | null {
  const ids = config.items.map((i) => i.id);
  if (ids.length > RIVER_MAX_ITEMS) throw new RangeError(`at most ${RIVER_MAX_ITEMS} items`);
  if (!isRiverStateValid(from, config)) return null;
  const cap = config.boatCapacity ?? 1;
  const seen = new Map<string, { prev: string | null; move: RiverMove | null; state: RiverState }>();
  const startKey = stateKey(from, ids);
  seen.set(startKey, { prev: null, move: null, state: from });
  const queue = [startKey];
  while (queue.length) {
    const key = queue.shift() as string;
    const { state } = seen.get(key)!;
    if (isRiverSolved(state, config)) {
      const path: RiverMove[] = [];
      for (let k: string | null = key; k; k = seen.get(k)!.prev) {
        const m = seen.get(k)!.move;
        if (m) path.unshift(m);
      }
      return path;
    }
    const here = ids.filter((id) => bankOf(state, id) === state.farmer);
    for (const carry of subsetsUpTo(here, cap)) {
      const next = crossRiver(state, carry);
      if (!isRiverStateValid(next, config)) continue;
      const nk = stateKey(next, ids);
      if (seen.has(nk)) continue;
      seen.set(nk, { prev: key, move: { carry, to: next.farmer }, state: next });
      queue.push(nk);
    }
  }
  return null;
}

/** States along a move list, starting with `from` (for reveal playback). */
export function riverTimeline(moves: readonly RiverMove[], from: RiverState = initialRiverState()): RiverState[] {
  const out = [from];
  for (const m of moves) out.push(crossRiver(out[out.length - 1], m.carry));
  return out;
}

export const WOLF_GOAT_CABBAGE = {
  items: [
    { id: "wolf", emoji: "🐺", label: { en: "wolf", zh: "狼" } },
    { id: "goat", emoji: "🐐", label: { en: "goat", zh: "羊" } },
    { id: "cabbage", emoji: "🥬", label: { en: "cabbage", zh: "白菜" } },
  ],
  conflicts: [
    ["wolf", "goat"],
    ["goat", "cabbage"],
  ] as Array<[string, string]>,
  boatCapacity: 1,
};
