/** Pure helpers for water_jugs (F6): fill, empty and pour between two jugs to measure a target. */
import { gcd } from "./sequences";

export interface JugsConfigLike {
  jugs: readonly [number, number];
  target: number;
}
export type JugState = readonly [number, number];
export type JugAction = { kind: "fill"; jug: 0 | 1 } | { kind: "empty"; jug: 0 | 1 } | { kind: "pour"; from: 0 | 1; to: 0 | 1 };

export const JUG_ACTIONS: readonly JugAction[] = [
  { kind: "fill", jug: 0 },
  { kind: "fill", jug: 1 },
  { kind: "empty", jug: 0 },
  { kind: "empty", jug: 1 },
  { kind: "pour", from: 0, to: 1 },
  { kind: "pour", from: 1, to: 0 },
];

export function applyJugAction(state: JugState, action: JugAction, caps: readonly [number, number]): [number, number] {
  const next: [number, number] = [state[0], state[1]];
  if (action.kind === "fill") next[action.jug] = caps[action.jug];
  else if (action.kind === "empty") next[action.jug] = 0;
  else {
    const amount = Math.min(next[action.from], caps[action.to] - next[action.to]);
    next[action.from] -= amount;
    next[action.to] += amount;
  }
  return next;
}

/** Does the action change anything? (Filling a full jug is a wasted step.) */
export function jugActionChanges(state: JugState, action: JugAction, caps: readonly [number, number]): boolean {
  const n = applyJugAction(state, action, caps);
  return n[0] !== state[0] || n[1] !== state[1];
}

export function isJugsSolved(state: JugState, target: number): boolean {
  return state[0] === target || state[1] === target;
}

/** Reachable iff target fits in the bigger jug and is a multiple of gcd(a, b) (4 and 6 can't make 5). */
export function jugsReachable(config: JugsConfigLike): boolean {
  const [a, b] = config.jugs;
  return config.target >= 0 && config.target <= Math.max(a, b) && config.target % gcd(a, b) === 0;
}

/** Shortest action list from two empty jugs (3 & 5 → 4: six steps), or null if impossible. */
export function jugsShortestSolution(config: JugsConfigLike): JugAction[] | null {
  const caps = config.jugs;
  const start: JugState = [0, 0];
  const key = (s: JugState) => `${s[0]},${s[1]}`;
  const prev = new Map<string, { parent: string; action: JugAction } | null>([[key(start), null]]);
  const queue: JugState[] = [start];
  let goal: string | null = isJugsSolved(start, config.target) ? key(start) : null;
  while (queue.length && goal === null) {
    const cur = queue.shift() as JugState;
    for (const action of JUG_ACTIONS) {
      const next = applyJugAction(cur, action, caps);
      const k = key(next);
      if (prev.has(k)) continue;
      prev.set(k, { parent: key(cur), action });
      if (isJugsSolved(next, config.target)) {
        goal = k;
        break;
      }
      queue.push(next);
    }
  }
  if (goal === null) return null;
  const out: JugAction[] = [];
  for (let k = goal, step = prev.get(k); step; k = step.parent, step = prev.get(k)) out.unshift(step.action);
  return out;
}

/** States after each action, starting from empty jugs. */
export function jugsTimeline(actions: readonly JugAction[], caps: readonly [number, number]): Array<[number, number]> {
  const out: Array<[number, number]> = [[0, 0]];
  for (const a of actions) out.push(applyJugAction(out[out.length - 1], a, caps));
  return out;
}

/**
 * The bookkeeping behind a solution: litres taken from the tap (+) and poured away (−), minus what
 * is left in the other jug, give the target (3 & 5: +5 +5 −3 −3 = 4).
 */
export function jugsLedger(actions: readonly JugAction[], config: JugsConfigLike): { terms: number[]; result: number } {
  const states = jugsTimeline(actions, config.jugs);
  const terms: number[] = [];
  actions.forEach((a, i) => {
    if (a.kind === "fill") terms.push(config.jugs[a.jug] - states[i][a.jug]);
    else if (a.kind === "empty") terms.push(-states[i][a.jug]);
  });
  const last = states[states.length - 1];
  const holder = last[0] === config.target ? 0 : 1;
  const other = last[1 - holder];
  if (other > 0) terms.push(-other);
  return { terms, result: terms.reduce((s, t) => s + t, 0) };
}
