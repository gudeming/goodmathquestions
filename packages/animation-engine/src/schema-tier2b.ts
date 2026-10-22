/**
 * Tier-2 scene schemas, batch 3b (03-scene-catalog.md §3). Same conventions as schema.ts and
 * schema-tier2a.ts: plain object bases (for the discriminated union) + per-type consistency
 * checks, applied both to the exported per-scene schemas and to the union via `superRefine`.
 */
import { z } from "zod";
import { SHAPE_SIDES, TILE_SHAPES, tilesAlone } from "./scenes/tiling";
import { dominoTiling } from "./scenes/domino";
import { lcm, staircaseWays } from "./scenes/sequences";
import { centreRule, monthGrid, windowAround } from "./scenes/calendar";
import { frogMinMoves } from "./scenes/frogs";
import { jugsReachable, jugsShortestSolution } from "./scenes/jugs";
import { mirrorKey, queensSolutions } from "./scenes/queens";
import { binarySearchSteps } from "./scenes/guess";
import { EXPR_TILE_OPS, literalNumbers, literalOps, sameNumbers } from "./scenes/expression";
import { flyTotal } from "./scenes/trains";

const Bi = z.object({ en: z.string().min(1), zh: z.string().min(1) });
const num = z.number().finite();
const int = num.int();

type Check<T> = (c: T, ctx: z.RefinementCtx) => void;
const issue = (ctx: z.RefinementCtx, path: Array<string | number>, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

/** B9: which regular polygons tile a floor on their own? */
export const TilingLabBase = z.object({
  type: z.literal("tiling_lab"),
  shapes: z.array(z.enum(TILE_SHAPES)).min(1).max(5).default(["triangle", "square", "pentagon", "hexagon"]),
  /** Rings of tiles in the "tile the floor" view (1..4). */
  gridSize: int.min(1).max(4).default(2),
  /** Answer-bearing: when given, must be exactly the shapes (of `shapes`) whose angle divides 360°. */
  tilers: z.array(z.enum(TILE_SHAPES)).optional(),
});

/** B10: cover a board (with cells removed) with 1 × 2 dominoes. Cells are [row, col], row 0 on top. */
export const DominoTilingBase = z.object({
  type: z.literal("domino_tiling"),
  size: int.min(2).max(8).default(8),
  removed: z.array(z.tuple([int.min(0), int.min(0)])).max(8).default([]),
  /** Answer-bearing: when given, must agree with an exact search for a tiling. */
  tileable: z.boolean().optional(),
});

/** E2: climb `steps` stairs (≤ 6, playable) with hops of 1..maxHop; the question asks about `askN`. */
export const StaircasePathsBase = z.object({
  type: z.literal("staircase_paths"),
  steps: int.min(1).max(6).default(4),
  maxHop: z.union([z.literal(2), z.literal(3)]).default(2),
  askN: int.min(1).max(40).default(10),
  /** Answer-bearing: ways to climb `askN` (10 → 89). */
  ways: int.optional(),
});

/** E4: Pascal's triangle, rows 0..rows; the first `prefilled` rows are given. */
export const PascalTriangleBase = z.object({
  type: z.literal("pascal_triangle"),
  rows: int.min(4).max(12).default(10),
  prefilled: int.min(1).max(13).default(3),
  /** Row the question asks about (default: the last row). */
  askRow: int.min(0).max(12).optional(),
  /** Answer-bearing: sum of `askRow` (2^n; row 10 → 1024). */
  rowSum: int.optional(),
});

/** E7: a 3 × 3 window on a month. `year` + `month` for a real month, neither for a generic 31-day grid. */
export const CalendarGridBase = z.object({
  type: z.literal("calendar_grid"),
  year: int.min(1900).max(2100).optional(),
  month: int.min(1).max(12).optional(),
  /** Day the window starts centred on (the question's "middle is 17"). */
  centre: int.min(1).max(31).optional(),
  /** Answer-bearing: 9 × centre. */
  sum: int.optional(),
});

/** E8: two cycles (cicadas every `a` years, predators every `b`); when do they meet? */
export const CycleTimelineBase = z.object({
  type: z.literal("cycle_timeline"),
  a: int.min(2).max(30).default(13),
  b: int.min(2).max(30).default(6),
  years: int.min(20).max(200).default(120),
  /** The non-prime cycle to compare with (E8: 12). */
  altA: int.min(2).max(30).optional(),
  labels: z.object({ a: Bi.optional(), b: Bi.optional() }).optional(),
  /** Answer-bearing: lcm(a, b) (13, 6 → 78). */
  collision: int.optional(),
});

/** E9: n green frogs and n brown frogs swap sides on 2n + 1 lily pads. */
export const FrogPuzzleBase = z.object({
  type: z.literal("frog_puzzle"),
  perSide: int.min(1).max(4).default(3),
  /** Answer-bearing: n(n + 2) (3 → 15). */
  minMoves: int.optional(),
});

/** F6: measure `target` litres with two jugs and a tap. */
export const WaterJugsBase = z.object({
  type: z.literal("water_jugs"),
  jugs: z.tuple([int.min(1).max(20), int.min(1).max(20)]).default([3, 5]),
  target: int.min(1).max(20).default(4),
  /** Answer-bearing: length of the shortest solution (3, 5 → 4: 6). */
  minSteps: int.optional(),
});

/** F7: n queens, none attacking another. */
export const QueensBoardBase = z.object({
  type: z.literal("queens_board"),
  n: int.min(4).max(8).default(4),
  /** Show "found k of N". */
  countSolutions: z.boolean().default(true),
  /** Count a solution and its mirror image once. */
  dedupeMirrors: z.boolean().default(false),
  /** Answer-bearing: number of solutions (with dedupeMirrors: of mirror pairs). 4 → 2, 8 → 92. */
  solutions: int.optional(),
});

/** F12: higher / lower on 1..max, both ways round. */
export const GuessGameBase = z.object({
  type: z.literal("guess_game"),
  max: int.min(10).max(1000).default(100),
  /** Who guesses first. */
  mode: z.enum(["you_guess", "computer_guesses"]).default("you_guess"),
  seed: int.optional(),
  /** Answer-bearing: guesses that always suffice (100 → 7). */
  minGuesses: int.optional(),
});

/** F5: build an expression from number tiles and operator tiles (evaluated by @gmq/math-engine). */
export const ExpressionBuilderBase = z.object({
  type: z.literal("expression_builder"),
  allowedNumbers: z.array(int.min(0).max(99)).min(1).max(6),
  target: num,
  /** Same names as the EXPRESSION answer spec; parentheses are always available. */
  allowedOps: z.array(z.enum(EXPR_TILE_OPS)).min(1),
  /** Known solutions shown in the reveal (ASCII or × ÷ −). Values are checked against the evaluator by the web tests. */
  solutions: z.array(z.string().min(1).max(60)).max(6).optional(),
});

/** F10: blindfolded, split off as many coins as there are heads and flip them. */
export const CoinPilesBase = z.object({
  type: z.literal("coin_piles"),
  coins: int.min(10).max(200).default(100),
  heads: int.min(1).max(50).default(10),
  seed: int.optional(),
});

/** F11: two trains closing in, a fly bouncing between them. */
export const TrainsFlyBase = z.object({
  type: z.literal("trains_fly"),
  distanceKm: num.min(10).max(1000).default(100),
  trainSpeed: num.positive().max(500).default(50),
  flySpeed: num.positive().max(2000).default(75),
  /** Answer-bearing: flySpeed × meeting time (75). */
  flyKm: num.optional(),
});

// ---------------------------------------------------------------------------
// Consistency checks
// ---------------------------------------------------------------------------

const checkTiling: Check<z.infer<typeof TilingLabBase>> = (c, ctx) => {
  if (new Set(c.shapes).size !== c.shapes.length) issue(ctx, ["shapes"], "shapes must be different");
  if (c.tilers) {
    const truth = c.shapes.filter((s) => tilesAlone(SHAPE_SIDES[s])).sort();
    const given = [...new Set(c.tilers)].sort();
    if (given.length !== c.tilers.length || given.join() !== truth.join())
      issue(ctx, ["tilers"], `the shapes that tile alone are ${truth.join(", ") || "none"}, not ${c.tilers.join(", ")}`);
  }
};

const checkDomino: Check<z.infer<typeof DominoTilingBase>> = (c, ctx) => {
  const keys = c.removed.map(([r, col]) => `${r},${col}`);
  if (new Set(keys).size !== keys.length) issue(ctx, ["removed"], "removed cells must be different");
  let inside = true;
  c.removed.forEach(([r, col], i) => {
    if (r >= c.size || col >= c.size) {
      issue(ctx, ["removed", i], `cell [${r}, ${col}] is off a ${c.size} × ${c.size} board`);
      inside = false;
    }
  });
  if (!inside) return;
  if (c.size * c.size - new Set(keys).size < 2) issue(ctx, ["removed"], "leave at least two cells");
  if (c.tileable !== undefined) {
    const truth = dominoTiling(c) !== null;
    if (truth !== c.tileable) issue(ctx, ["tileable"], `tileable is ${c.tileable} but the board ${truth ? "can" : "can't"} be tiled`);
  }
};

const checkStairs: Check<z.infer<typeof StaircasePathsBase>> = (c, ctx) => {
  const truth = staircaseWays(c.askN, c.maxHop);
  if (c.ways !== undefined && c.ways !== truth) issue(ctx, ["ways"], `${c.askN} stairs with hops up to ${c.maxHop} have ${truth} ways, not ${c.ways}`);
};

const checkPascal: Check<z.infer<typeof PascalTriangleBase>> = (c, ctx) => {
  if (c.prefilled > c.rows + 1) issue(ctx, ["prefilled"], `only ${c.rows + 1} rows exist`);
  const ask = c.askRow ?? c.rows;
  if (ask > c.rows) issue(ctx, ["askRow"], `askRow must be within 0..rows (${c.rows})`);
  if (c.rowSum !== undefined && c.rowSum !== 2 ** ask) issue(ctx, ["rowSum"], `row ${ask} adds up to ${2 ** ask}, not ${c.rowSum}`);
};

const checkCalendar: Check<z.infer<typeof CalendarGridBase>> = (c, ctx) => {
  if ((c.year === undefined) !== (c.month === undefined)) {
    issue(ctx, ["month"], "give both year and month, or neither");
    return;
  }
  if (c.centre !== undefined && !windowAround(monthGrid(c.year, c.month), c.centre))
    issue(ctx, ["centre"], `a 3 × 3 window centred on ${c.centre} doesn't fit on this month`);
  if (c.sum !== undefined) {
    if (c.centre === undefined) issue(ctx, ["sum"], "sum needs centre");
    else if (c.sum !== centreRule(c.centre)) issue(ctx, ["sum"], `the window around ${c.centre} adds up to ${centreRule(c.centre)}, not ${c.sum}`);
  }
};

const checkCycles: Check<z.infer<typeof CycleTimelineBase>> = (c, ctx) => {
  if (c.altA !== undefined && c.altA === c.a) issue(ctx, ["altA"], "altA must differ from a");
  if (c.collision !== undefined && c.collision !== lcm(c.a, c.b)) issue(ctx, ["collision"], `cycles of ${c.a} and ${c.b} meet every ${lcm(c.a, c.b)} years, not ${c.collision}`);
};

const checkFrogs: Check<z.infer<typeof FrogPuzzleBase>> = (c, ctx) => {
  if (c.minMoves !== undefined && c.minMoves !== frogMinMoves(c.perSide)) issue(ctx, ["minMoves"], `${c.perSide} frogs a side need ${frogMinMoves(c.perSide)} moves, not ${c.minMoves}`);
};

const checkJugs: Check<z.infer<typeof WaterJugsBase>> = (c, ctx) => {
  const [a, b] = c.jugs;
  if (a === b) {
    issue(ctx, ["jugs"], "the two jugs must have different sizes");
    return;
  }
  if (!jugsReachable(c)) {
    issue(ctx, ["target"], `${c.target} litres can't be measured with ${a} and ${b} (it must fit in a jug and be a multiple of their gcd)`);
    return;
  }
  const best = jugsShortestSolution(c)?.length;
  if (c.minSteps !== undefined && c.minSteps !== best) issue(ctx, ["minSteps"], `the shortest solution takes ${best} steps, not ${c.minSteps}`);
};

const checkQueens: Check<z.infer<typeof QueensBoardBase>> = (c, ctx) => {
  if (c.solutions === undefined) return;
  const all = queensSolutions(c.n);
  const truth = c.dedupeMirrors ? new Set(all.map(mirrorKey)).size : all.length;
  if (c.solutions !== truth) issue(ctx, ["solutions"], `${c.n} × ${c.n} has ${truth} ${c.dedupeMirrors ? "mirror pairs of " : ""}solutions, not ${c.solutions}`);
};

const checkGuess: Check<z.infer<typeof GuessGameBase>> = (c, ctx) => {
  if (c.minGuesses !== undefined && c.minGuesses !== binarySearchSteps(c.max)) issue(ctx, ["minGuesses"], `1..${c.max} needs ${binarySearchSteps(c.max)} guesses, not ${c.minGuesses}`);
};

const EXPR_CHARS = /^(?:[0-9+\-*/^!()√×÷−\s]|sqrt)*$/;

const checkExpression: Check<z.infer<typeof ExpressionBuilderBase>> = (c, ctx) => {
  if (new Set(c.allowedOps).size !== c.allowedOps.length) issue(ctx, ["allowedOps"], "allowedOps must be different");
  const concat = c.allowedOps.includes("concat");
  if (concat && c.allowedNumbers.some((n) => n > 9)) issue(ctx, ["allowedNumbers"], "with concat, numbers must be single digits (44 is read as two 4s)");
  c.solutions?.forEach((s, i) => {
    if (!EXPR_CHARS.test(s)) return issue(ctx, ["solutions", i], `"${s}" has characters the evaluator doesn't read`);
    if (!sameNumbers(literalNumbers(s, concat), c.allowedNumbers)) issue(ctx, ["solutions", i], `"${s}" must use exactly ${c.allowedNumbers.join(", ")}`);
    const bad = literalOps(s, concat).filter((op) => !c.allowedOps.includes(op));
    if (bad.length) issue(ctx, ["solutions", i], `"${s}" uses ${bad.join(" ")}, which is not allowed`);
  });
};

const checkCoins: Check<z.infer<typeof CoinPilesBase>> = (c, ctx) => {
  if (c.heads * 2 > c.coins) issue(ctx, ["heads"], "heads can be at most half the coins");
};

const checkTrains: Check<z.infer<typeof TrainsFlyBase>> = (c, ctx) => {
  if (c.flySpeed <= c.trainSpeed) issue(ctx, ["flySpeed"], "the fly must be faster than the trains");
  if (c.flyKm !== undefined && Math.abs(c.flyKm - flyTotal(c)) > 1e-9) issue(ctx, ["flyKm"], `the fly flies ${flyTotal(c)} km, not ${c.flyKm}`);
};

export const TIER2B_REFINEMENTS = {
  tiling_lab: checkTiling as Check<never>,
  domino_tiling: checkDomino as Check<never>,
  staircase_paths: checkStairs as Check<never>,
  pascal_triangle: checkPascal as Check<never>,
  calendar_grid: checkCalendar as Check<never>,
  cycle_timeline: checkCycles as Check<never>,
  frog_puzzle: checkFrogs as Check<never>,
  water_jugs: checkJugs as Check<never>,
  queens_board: checkQueens as Check<never>,
  guess_game: checkGuess as Check<never>,
  expression_builder: checkExpression as Check<never>,
  coin_piles: checkCoins as Check<never>,
  trains_fly: checkTrains as Check<never>,
} satisfies Record<string, Check<never>>;

export const TilingLabSchema = TilingLabBase.superRefine(checkTiling);
export const DominoTilingSchema = DominoTilingBase.superRefine(checkDomino);
export const StaircasePathsSchema = StaircasePathsBase.superRefine(checkStairs);
export const PascalTriangleSchema = PascalTriangleBase.superRefine(checkPascal);
export const CalendarGridSchema = CalendarGridBase.superRefine(checkCalendar);
export const CycleTimelineSchema = CycleTimelineBase.superRefine(checkCycles);
export const FrogPuzzleSchema = FrogPuzzleBase.superRefine(checkFrogs);
export const WaterJugsSchema = WaterJugsBase.superRefine(checkJugs);
export const QueensBoardSchema = QueensBoardBase.superRefine(checkQueens);
export const GuessGameSchema = GuessGameBase.superRefine(checkGuess);
export const ExpressionBuilderSchema = ExpressionBuilderBase.superRefine(checkExpression);
export const CoinPilesSchema = CoinPilesBase.superRefine(checkCoins);
export const TrainsFlySchema = TrainsFlyBase.superRefine(checkTrains);

export const TIER2B_SCENE_TYPES = [
  "tiling_lab",
  "domino_tiling",
  "staircase_paths",
  "pascal_triangle",
  "calendar_grid",
  "cycle_timeline",
  "frog_puzzle",
  "water_jugs",
  "queens_board",
  "guess_game",
  "expression_builder",
  "coin_piles",
  "trains_fly",
] as const;
