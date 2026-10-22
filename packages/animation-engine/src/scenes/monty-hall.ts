import { mulberry32, randomInt, type Rng } from "./random";

export type MontyStrategy = "switch" | "stay";

export interface MontyRound {
  doors: number;
  prize: number;
  firstPick: number;
  /** Doors the host opened (all empty, never the first pick). */
  opened: number[];
  /** The single other door left closed. */
  offered: number;
  finalPick: number;
  win: boolean;
}

export interface MontyStats {
  switchWins: number;
  switchGames: number;
  stayWins: number;
  stayGames: number;
}

export const EMPTY_MONTY_STATS: MontyStats = { switchWins: 0, switchGames: 0, stayWins: 0, stayGames: 0 };

/**
 * The host knows where the prize is and opens every door except the child's pick
 * and one other. If the child picked the prize, the other closed door is random.
 */
export function hostOpens(doors: number, prize: number, firstPick: number, rng: Rng): { opened: number[]; offered: number } {
  let offered: number;
  if (firstPick === prize) {
    const others = Array.from({ length: doors }, (_, i) => i).filter((d) => d !== firstPick);
    offered = others[randomInt(rng, 0, others.length - 1)];
  } else {
    offered = prize;
  }
  const opened = Array.from({ length: doors }, (_, i) => i).filter((d) => d !== firstPick && d !== offered);
  return { opened, offered };
}

/** Play one full round with a fixed strategy. */
export function playMontyRound(doors: number, strategy: MontyStrategy, rng: Rng, firstPick?: number): MontyRound {
  const prize = randomInt(rng, 0, doors - 1);
  const pick = firstPick ?? randomInt(rng, 0, doors - 1);
  const { opened, offered } = hostOpens(doors, prize, pick, rng);
  const finalPick = strategy === "switch" ? offered : pick;
  return { doors, prize, firstPick: pick, opened, offered, finalPick, win: finalPick === prize };
}

/** Fold a finished round into running stats (pure). */
export function addMontyRound(stats: MontyStats, strategy: MontyStrategy, win: boolean): MontyStats {
  return strategy === "switch"
    ? { ...stats, switchGames: stats.switchGames + 1, switchWins: stats.switchWins + (win ? 1 : 0) }
    : { ...stats, stayGames: stats.stayGames + 1, stayWins: stats.stayWins + (win ? 1 : 0) };
}

/** Simulate `rounds` rounds with one strategy. */
export function simulateMonty(doors: number, rounds: number, strategy: MontyStrategy, seed: number, base: MontyStats = EMPTY_MONTY_STATS): MontyStats {
  const rng = mulberry32(seed);
  let stats = base;
  for (let i = 0; i < rounds; i++) stats = addMontyRound(stats, strategy, playMontyRound(doors, strategy, rng).win);
  return stats;
}

/** Theoretical win probabilities: stay = 1/d, switch = (d - 1)/d. */
export function montyOdds(doors: number): { stay: number; switch: number } {
  return { stay: 1 / doors, switch: (doors - 1) / doors };
}
