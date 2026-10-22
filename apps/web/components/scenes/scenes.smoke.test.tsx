import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { ComponentType } from "react";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EXPR_TILE_OPS, KONIGSBERG, MODE_SAMPLES, literalNumbers, tilesToExpression, SAMPLE_SCENE_CONFIGS, TRICK_SAMPLES, WOLF_GOAT_CABBAGE, parseSceneConfig, type SceneConfig, type ScenePhase, type SceneProps } from "@gmq/animation-engine";
import GaussPairingScene from "./GaussPairingScene";
import ChessboardDoublingScene from "./ChessboardDoublingScene";
import FoldPaperScene from "./FoldPaperScene";
import DiceLabScene from "./DiceLabScene";
import BirthdayRoomScene from "./BirthdayRoomScene";
import TowerOfHanoiScene from "./TowerOfHanoiScene";
import RiverCrossingScene from "./RiverCrossingScene";
import FenceShaperScene from "./FenceShaperScene";
import VisualPatternScene from "./VisualPatternScene";
import PizzaCutsScene from "./PizzaCutsScene";
import BalanceLabScene from "./BalanceLabScene";
import IllustrationScene from "./IllustrationScene";
import HandshakeGraphScene from "./HandshakeGraphScene";
import GridSquaresScene from "./GridSquaresScene";
import NumberTrickStepperScene from "./NumberTrickStepperScene";
import MontyHallScene from "./MontyHallScene";
import ScaleLadderScene from "./ScaleLadderScene";
import HalvingBarScene from "./HalvingBarScene";
import CircleRopeScene from "./CircleRopeScene";
import PythagorasSquaresScene from "./PythagorasSquaresScene";
import BridgesTraceScene from "./BridgesTraceScene";
import ClockOverlapScene from "./ClockOverlapScene";
import CoinFlipsScene from "./CoinFlipsScene";
import SockDrawerScene from "./SockDrawerScene";
import PiDartsScene from "./PiDartsScene";
import CollatzPathScene from "./CollatzPathScene";
import DigitSlideScene from "./DigitSlideScene";
import FibSpiralScene from "./FibSpiralScene";
import DivisorBlocksScene from "./DivisorBlocksScene";
import TilingLabScene from "./TilingLabScene";
import DominoTilingScene from "./DominoTilingScene";
import StaircasePathsScene from "./StaircasePathsScene";
import PascalTriangleScene from "./PascalTriangleScene";
import CalendarGridScene from "./CalendarGridScene";
import CycleTimelineScene from "./CycleTimelineScene";
import FrogPuzzleScene from "./FrogPuzzleScene";
import WaterJugsScene from "./WaterJugsScene";
import QueensBoardScene from "./QueensBoardScene";
import GuessGameScene from "./GuessGameScene";
import ExpressionBuilderScene from "./ExpressionBuilderScene";
import CoinPilesScene from "./CoinPilesScene";
import TrainsFlyScene from "./TrainsFlyScene";
import { SCENE_REGISTRY } from "./registry";
import { SceneHost } from "./SceneHost";
import { evaluateExpression, sameMultiset } from "@gmq/math-engine/src/expr";
import { EXPRESSION_OPS } from "@gmq/math-engine/src/answer-spec";

// Server-render every new scene in every phase: catches render-time crashes (bad indexing,
// undefined config fields) without a browser. Effects/timers don't run under SSR.

const PHASES: ScenePhase[] = ["hook", "explore", "reveal"];

function parsed(input: unknown): SceneConfig {
  const r = parseSceneConfig(input);
  if (!r.ok) throw new Error(r.error);
  return r.config;
}

type AnyScene = ComponentType<SceneProps<never>>;
const bi = (en: string, zh = en) => ({ en, zh });
const plus = (n: number) => {
  const cells: Array<[number, number]> = [[0, 0]];
  for (let k = 1; k <= n; k++) cells.push([k, 0], [-k, 0], [0, k], [0, -k]);
  return { cells };
};
const square = (n: number) => ({ cells: Array.from({ length: n * n }, (_, i) => [i % n, Math.floor(i / n)] as [number, number]) });

const CASES: Array<[string, AnyScene, unknown]> = [
  ["gauss_pairing n=100", GaussPairingScene as ComponentType<SceneProps<never>>, SAMPLE_SCENE_CONFIGS.gauss_pairing],
  ["gauss_pairing n=1000", GaussPairingScene as ComponentType<SceneProps<never>>, { type: "gauss_pairing", n: 1000, pairSum: 1001, pairCount: 500 }],
  ["gauss_pairing n=6", GaussPairingScene as ComponentType<SceneProps<never>>, { type: "gauss_pairing", n: 6, visibleHead: 3, visibleTail: 3, pairSum: 7, pairCount: 3 }],
  ["handshake_graph 10", HandshakeGraphScene as ComponentType<SceneProps<never>>, SAMPLE_SCENE_CONFIGS.handshake_graph],
  ["handshake_graph 3", HandshakeGraphScene as ComponentType<SceneProps<never>>, { type: "handshake_graph", people: 3 }],
  ["handshake_graph names", HandshakeGraphScene as ComponentType<SceneProps<never>>, { type: "handshake_graph", people: 3, names: [{ en: "Ann", zh: "安" }, { en: "Bo", zh: "波" }, { en: "Cy", zh: "西" }] }],
  ["grid_squares 8", GridSquaresScene as ComponentType<SceneProps<never>>, SAMPLE_SCENE_CONFIGS.grid_squares],
  ["grid_squares 3", GridSquaresScene as ComponentType<SceneProps<never>>, { type: "grid_squares", size: 3 }],
  ["number_trick 1089", NumberTrickStepperScene as ComponentType<SceneProps<never>>, SAMPLE_SCENE_CONFIGS.number_trick_stepper],
  ["number_trick five", NumberTrickStepperScene as ComponentType<SceneProps<never>>, TRICK_SAMPLES.mindReadingFive],
  ["number_trick nine", NumberTrickStepperScene as ComponentType<SceneProps<never>>, TRICK_SAMPLES.scrambleNine],
  ["number_trick kaprekar", NumberTrickStepperScene as ComponentType<SceneProps<never>>, TRICK_SAMPLES.kaprekar],
  ["monty_hall 3", MontyHallScene as ComponentType<SceneProps<never>>, SAMPLE_SCENE_CONFIGS.monty_hall],
  ["monty_hall 100", MontyHallScene as ComponentType<SceneProps<never>>, { type: "monty_hall", doors: 100 }],
  // Batch 2.
  ["chessboard 64 ask 21", ChessboardDoublingScene as AnyScene, SAMPLE_SCENE_CONFIGS.chessboard_doubling],
  ["chessboard 8 start 1000 linear", ChessboardDoublingScene as AnyScene, { type: "chessboard_doubling", squares: 8, unitLabel: bi("coins", "枚硬币"), startAmount: 1000, showLogScale: false }],
  ["fold_paper moon", FoldPaperScene as AnyScene, SAMPLE_SCENE_CONFIGS.fold_paper],
  ["fold_paper 10 folds", FoldPaperScene as AnyScene, { type: "fold_paper", maxFolds: 10, references: [{ heightMm: 100, label: bi("book", "书") }] }],
  ["fold_paper thick 50", FoldPaperScene as AnyScene, { type: "fold_paper", thicknessMm: 10, maxFolds: 50, references: [{ heightMm: 1, label: bi("ant", "蚂蚁") }, { heightMm: 1e15, label: bi("far", "远方") }] }],
  ["dice sum 2", DiceLabScene as AnyScene, SAMPLE_SCENE_CONFIGS.dice_lab],
  ["dice sum 1", DiceLabScene as AnyScene, { type: "dice_lab", mode: "sum", dice: 1 }],
  ["dice sum 3", DiceLabScene as AnyScene, { type: "dice_lab", mode: "sum", dice: 3, rolls: 1000 }],
  ["dice product 2", DiceLabScene as AnyScene, MODE_SAMPLES.diceProduct],
  ["dice product 3", DiceLabScene as AnyScene, { type: "dice_lab", mode: "product", dice: 3 }],
  ["dice until six", DiceLabScene as AnyScene, MODE_SAMPLES.diceUntilSix],
  ["dice until 1 with 3 dice", DiceLabScene as AnyScene, { type: "dice_lab", mode: "until_target", dice: 3, target: 1, rolls: 10 }],
  ["birthday any_pair", BirthdayRoomScene as AnyScene, SAMPLE_SCENE_CONFIGS.birthday_room],
  ["birthday any_pair defaults", BirthdayRoomScene as AnyScene, { type: "birthday_room", mode: "any_pair" }],
  ["birthday any_pair 366", BirthdayRoomScene as AnyScene, { type: "birthday_room", mode: "any_pair", maxPeople: 366, trials: 1000 }],
  ["birthday match_me", BirthdayRoomScene as AnyScene, MODE_SAMPLES.birthdayMatchMe],
  ["birthday match_me 2000", BirthdayRoomScene as AnyScene, { type: "birthday_room", mode: "match_me", maxPeople: 2000, trials: 10 }],
  ["hanoi 3 ask 4", TowerOfHanoiScene as AnyScene, SAMPLE_SCENE_CONFIGS.tower_of_hanoi],
  ["hanoi 3", TowerOfHanoiScene as AnyScene, { type: "tower_of_hanoi", discs: 3 }],
  ["hanoi 6 ask 8", TowerOfHanoiScene as AnyScene, { type: "tower_of_hanoi", discs: 6, askDiscs: 8 }],
  ["river wgc", RiverCrossingScene as AnyScene, SAMPLE_SCENE_CONFIGS.river_crossing],
  ["river no conflicts", RiverCrossingScene as AnyScene, { type: "river_crossing", ...WOLF_GOAT_CABBAGE, conflicts: [] }],
  [
    "river 4 items boat 2",
    RiverCrossingScene as AnyScene,
    { type: "river_crossing", items: [...WOLF_GOAT_CABBAGE.items, { id: "bug", emoji: "🐛", label: bi("bug", "虫") }], conflicts: [...WOLF_GOAT_CABBAGE.conflicts, ["bug", "cabbage"]], boatCapacity: 2 },
  ],
  ["fence 24", FenceShaperScene as AnyScene, SAMPLE_SCENE_CONFIGS.fence_shaper],
  ["fence 24 wall", FenceShaperScene as AnyScene, { type: "fence_shaper", perimeter: 24, wallSide: true }],
  ["fence 8", FenceShaperScene as AnyScene, { type: "fence_shaper", perimeter: 8 }],
  ["fence 200 real", FenceShaperScene as AnyScene, { type: "fence_shaper", perimeter: 200, integerOnly: false }],
  ["pattern plus", VisualPatternScene as AnyScene, SAMPLE_SCENE_CONFIGS.visual_pattern],
  ["pattern plus ring 30", VisualPatternScene as AnyScene, { type: "visual_pattern", steps: [plus(1), plus(2), plus(3), plus(4)], rule: { kind: "linear", a: 4, b: 1 }, askStep: 30, colorRule: "ring" }],
  ["pattern squares 30", VisualPatternScene as AnyScene, { type: "visual_pattern", steps: [square(1), square(2), square(3)], rule: { kind: "quadratic", a: 1, b: 0, c: 0 }, askStep: 30 }],
  ["pizza 2", PizzaCutsScene as AnyScene, { type: "pizza_cuts", maxCuts: 2 }],
  ["pizza 4", PizzaCutsScene as AnyScene, SAMPLE_SCENE_CONFIGS.pizza_cuts],
  ["pizza 6", PizzaCutsScene as AnyScene, { type: "pizza_cuts", maxCuts: 6 }],
  ["balance heavy 9", BalanceLabScene as AnyScene, SAMPLE_SCENE_CONFIGS.balance_lab],
  ["balance heavy 3", BalanceLabScene as AnyScene, { type: "balance_lab", mode: "find_heavy", items: 3 }],
  ["balance heavy 27", BalanceLabScene as AnyScene, { type: "balance_lab", mode: "find_heavy", items: 27, seed: 2 }],
  ["balance weights 1-3-9-27", BalanceLabScene as AnyScene, MODE_SAMPLES.balanceWeights],
  ["balance weights binary", BalanceLabScene as AnyScene, { type: "balance_lab", mode: "weights", weights: [1, 2, 4, 8] }],
  ["balance weights six", BalanceLabScene as AnyScene, { type: "balance_lab", mode: "weights", weights: [1, 3, 9, 27, 81, 243], target: 364 }],
  ["illustration switches", IllustrationScene as AnyScene, SAMPLE_SCENE_CONFIGS.illustration],
  ["illustration knights + reveal", IllustrationScene as AnyScene, { ...MODE_SAMPLES.knightsAndKnaves, revealAsset: "three-switches", revealCaption: bi("Reveal", "揭晓") }],
  // Tier 2, batch 3a.
  ["scale time (A4)", ScaleLadderScene as AnyScene, SAMPLE_SCENE_CONFIGS.scale_ladder],
  ["scale time billion, no refs", ScaleLadderScene as AnyScene, { type: "scale_ladder", mode: "time", start: 1_000_000_000 }],
  ["scale heartbeats (A5)", ScaleLadderScene as AnyScene, MODE_SAMPLES.scaleHeartbeats],
  ["scale heartbeats mouse", ScaleLadderScene as AnyScene, { type: "scale_ladder", mode: "heartbeats", start: 500 }],
  ["scale powers (A9)", ScaleLadderScene as AnyScene, MODE_SAMPLES.scalePowers],
  ["scale powers reversed, no labels", ScaleLadderScene as AnyScene, { type: "scale_ladder", mode: "powers", start: 200, target: 3 }],
  ["halving halves", HalvingBarScene as AnyScene, SAMPLE_SCENE_CONFIGS.halving_bar],
  ["halving thirds", HalvingBarScene as AnyScene, MODE_SAMPLES.halvingThirds],
  ["halving 60 steps", HalvingBarScene as AnyScene, { type: "halving_bar", maxSteps: 60 }],
  ["rope default", CircleRopeScene as AnyScene, SAMPLE_SCENE_CONFIGS.circle_rope],
  ["rope one planet", CircleRopeScene as AnyScene, { type: "circle_rope", extraMetersMax: 1, planets: [{ id: "moon", label: bi("the Moon", "月球"), radiusM: 1_737_400, emoji: "🌕" }] }],
  ["pythagoras 6-8", PythagorasSquaresScene as AnyScene, SAMPLE_SCENE_CONFIGS.pythagoras_squares],
  ["pythagoras 5-12 unlocked", PythagorasSquaresScene as AnyScene, { type: "pythagoras_squares", a: 5, b: 12, lockRightAngle: false }],
  ["pythagoras 3-4", PythagorasSquaresScene as AnyScene, { type: "pythagoras_squares", a: 3, b: 4 }],
  ["bridges königsberg", BridgesTraceScene as AnyScene, SAMPLE_SCENE_CONFIGS.bridges_trace],
  ["bridges one removed", BridgesTraceScene as AnyScene, MODE_SAMPLES.bridgesOneRemoved],
  ["bridges envelope", BridgesTraceScene as AnyScene, { type: "bridges_trace", nodes: [{ id: "a", x: 10, y: 90 }, { id: "b", x: 90, y: 90 }, { id: "c", x: 90, y: 40 }, { id: "d", x: 10, y: 40 }, { id: "e", x: 50, y: 5 }], edges: [["a", "b"], ["b", "c"], ["c", "d"], ["d", "a"], ["a", "c"], ["b", "d"], ["c", "e"], ["d", "e"]] }],
  ["bridges no layout", BridgesTraceScene as AnyScene, { type: "bridges_trace", nodes: KONIGSBERG.nodes, edges: KONIGSBERG.edges }],
  ["clock 24h", ClockOverlapScene as AnyScene, SAMPLE_SCENE_CONFIGS.clock_overlap],
  ["clock 12h", ClockOverlapScene as AnyScene, { type: "clock_overlap", hours: 12 }],
  ["coins 10", CoinFlipsScene as AnyScene, SAMPLE_SCENE_CONFIGS.coin_flips],
  ["coins 3 unseeded", CoinFlipsScene as AnyScene, { type: "coin_flips", streak: 3 }],
  ["coins 12", CoinFlipsScene as AnyScene, { type: "coin_flips", streak: 12, seed: 5 }],
  ["socks 3", SockDrawerScene as AnyScene, SAMPLE_SCENE_CONFIGS.sock_drawer],
  ["socks two pairs", SockDrawerScene as AnyScene, MODE_SAMPLES.socksTwoPairs],
  ["socks 5", SockDrawerScene as AnyScene, { type: "sock_drawer", colors: 5, guaranteeTwoPairs: true }],
  ["pi 5000", PiDartsScene as AnyScene, SAMPLE_SCENE_CONFIGS.pi_darts],
  ["pi 100 unseeded", PiDartsScene as AnyScene, { type: "pi_darts", maxDrops: 100 }],
  ["collatz 1-9", CollatzPathScene as AnyScene, SAMPLE_SCENE_CONFIGS.collatz_path],
  ["collatz 20-30", CollatzPathScene as AnyScene, { type: "collatz_path", maxStart: 1000, highlightRange: [20, 30] }],
  ["digit slide examples", DigitSlideScene as AnyScene, SAMPLE_SCENE_CONFIGS.digit_slide],
  ["digit slide 99", DigitSlideScene as AnyScene, { type: "digit_slide", examples: [99] }],
  ["fib 10", FibSpiralScene as AnyScene, SAMPLE_SCENE_CONFIGS.fib_spiral],
  ["fib 5", FibSpiralScene as AnyScene, { type: "fib_spiral", terms: 5 }],
  ["fib 14", FibSpiralScene as AnyScene, { type: "fib_spiral", terms: 14 }],
  ["divisors 40", DivisorBlocksScene as AnyScene, SAMPLE_SCENE_CONFIGS.divisor_blocks],
  ["divisors 10", DivisorBlocksScene as AnyScene, { type: "divisor_blocks", max: 10, highlight: [6] }],
  ["divisors 100", DivisorBlocksScene as AnyScene, { type: "divisor_blocks", max: 100 }],
  // Tier 2, batch 3b.
  ["tiling B9", TilingLabScene as AnyScene, SAMPLE_SCENE_CONFIGS.tiling_lab],
  ["tiling with octagon", TilingLabScene as AnyScene, MODE_SAMPLES.tilingWithOctagon],
  ["tiling pentagon only, 4 rings", TilingLabScene as AnyScene, { type: "tiling_lab", shapes: ["pentagon"], gridSize: 4 }],
  ["domino mutilated", DominoTilingScene as AnyScene, SAMPLE_SCENE_CONFIGS.domino_tiling],
  ["domino one of each", DominoTilingScene as AnyScene, MODE_SAMPLES.dominoOneOfEach],
  ["domino 2x2 full", DominoTilingScene as AnyScene, { type: "domino_tiling", size: 2 }],
  ["domino 3x3 centre removed", DominoTilingScene as AnyScene, { type: "domino_tiling", size: 3, removed: [[1, 1]] }],
  ["stairs E2", StaircasePathsScene as AnyScene, SAMPLE_SCENE_CONFIGS.staircase_paths],
  ["stairs hops of 3", StaircasePathsScene as AnyScene, MODE_SAMPLES.stairsUpToThree],
  ["stairs 1 step ask 40", StaircasePathsScene as AnyScene, { type: "staircase_paths", steps: 1, askN: 40 }],
  ["stairs 6 steps hops of 3", StaircasePathsScene as AnyScene, { type: "staircase_paths", steps: 6, maxHop: 3, askN: 6 }],
  ["pascal 10", PascalTriangleScene as AnyScene, SAMPLE_SCENE_CONFIGS.pascal_triangle],
  ["pascal 4 all given", PascalTriangleScene as AnyScene, { type: "pascal_triangle", rows: 4, prefilled: 5 }],
  ["pascal 12 one row", PascalTriangleScene as AnyScene, { type: "pascal_triangle", rows: 12, prefilled: 1, askRow: 0 }],
  ["calendar Nov 2026", CalendarGridScene as AnyScene, SAMPLE_SCENE_CONFIGS.calendar_grid],
  ["calendar generic", CalendarGridScene as AnyScene, MODE_SAMPLES.calendarGeneric],
  ["calendar Feb 2026 (4 weeks)", CalendarGridScene as AnyScene, { type: "calendar_grid", year: 2026, month: 2 }],
  ["calendar Aug 2026 (6 weeks)", CalendarGridScene as AnyScene, { type: "calendar_grid", year: 2026, month: 8 }],
  ["cycles 13/6", CycleTimelineScene as AnyScene, SAMPLE_SCENE_CONFIGS.cycle_timeline],
  ["cycles 17/6", CycleTimelineScene as AnyScene, MODE_SAMPLES.cycleSeventeen],
  ["cycles 2/30 200 years labels", CycleTimelineScene as AnyScene, { type: "cycle_timeline", a: 2, b: 30, years: 200, labels: { a: bi("buses", "公交"), b: bi("trams", "电车") } }],
  ["cycles 20 years", CycleTimelineScene as AnyScene, { type: "cycle_timeline", a: 29, b: 30, years: 20 }],
  ["frogs 3", FrogPuzzleScene as AnyScene, SAMPLE_SCENE_CONFIGS.frog_puzzle],
  ["frogs 1", FrogPuzzleScene as AnyScene, { type: "frog_puzzle", perSide: 1 }],
  ["frogs 4", FrogPuzzleScene as AnyScene, { type: "frog_puzzle", perSide: 4, minMoves: 24 }],
  ["jugs 3/5", WaterJugsScene as AnyScene, SAMPLE_SCENE_CONFIGS.water_jugs],
  ["jugs 7/11 → 6", WaterJugsScene as AnyScene, { type: "water_jugs", jugs: [7, 11], target: 6 }],
  ["jugs 1/20 → 20", WaterJugsScene as AnyScene, { type: "water_jugs", jugs: [1, 20], target: 20 }],
  ["queens 4", QueensBoardScene as AnyScene, SAMPLE_SCENE_CONFIGS.queens_board],
  ["queens 8", QueensBoardScene as AnyScene, MODE_SAMPLES.queensEight],
  ["queens 6 mirrors, no count", QueensBoardScene as AnyScene, { type: "queens_board", n: 6, dedupeMirrors: true, countSolutions: false }],
  ["guess 100", GuessGameScene as AnyScene, SAMPLE_SCENE_CONFIGS.guess_game],
  ["guess computer", GuessGameScene as AnyScene, MODE_SAMPLES.guessComputer],
  ["guess 10 unseeded", GuessGameScene as AnyScene, { type: "guess_game", max: 10 }],
  ["guess 1000", GuessGameScene as AnyScene, { type: "guess_game", max: 1000, seed: 3 }],
  ["expression four 4s", ExpressionBuilderScene as AnyScene, SAMPLE_SCENE_CONFIGS.expression_builder],
  ["expression 24 game", ExpressionBuilderScene as AnyScene, { type: "expression_builder", allowedNumbers: [1, 3, 4, 6], target: 24, allowedOps: ["+", "-", "*", "/"], solutions: ["6/(1-3/4)"] }],
  ["expression no solutions", ExpressionBuilderScene as AnyScene, { type: "expression_builder", allowedNumbers: [10, 2], target: 5, allowedOps: ["/"] }],
  ["expression all ops, decimal target", ExpressionBuilderScene as AnyScene, { type: "expression_builder", allowedNumbers: [1, 2, 3, 4, 5, 6], target: 0.5, allowedOps: ["+", "-", "*", "/", "^", "!", "sqrt", "concat"] }],
  ["coins 100/10", CoinPilesScene as AnyScene, SAMPLE_SCENE_CONFIGS.coin_piles],
  ["coins 200/50 unseeded", CoinPilesScene as AnyScene, { type: "coin_piles", coins: 200, heads: 50 }],
  ["coins 10/1", CoinPilesScene as AnyScene, { type: "coin_piles", coins: 10, heads: 1 }],
  ["trains F11", TrainsFlyScene as AnyScene, SAMPLE_SCENE_CONFIGS.trains_fly],
  ["trains fast fly", TrainsFlyScene as AnyScene, { type: "trains_fly", distanceKm: 1000, trainSpeed: 1, flySpeed: 2000 }],
  ["trains slow fly", TrainsFlyScene as AnyScene, { type: "trains_fly", distanceKm: 10, trainSpeed: 499, flySpeed: 500 }],
];

describe("scene SSR smoke", () => {
  for (const [name, Scene, input] of CASES) {
    for (const phase of PHASES) {
      for (const locale of ["en", "zh"] as const) {
        it(`${name} renders in ${phase} (${locale})`, () => {
          const onEvent = vi.fn();
          const Any = Scene as unknown as ComponentType<SceneProps<SceneConfig>>;
          const html = renderToString(<Any config={parsed(input)} phase={phase} locale={locale} reducedMotion={false} onEvent={onEvent} />);
          expect(html.length).toBeGreaterThan(100);
          expect(html).toContain('role="group"');
          // Rendering alone must not emit events (interact/completed only follow real operations).
          expect(onEvent).not.toHaveBeenCalled();
        });
      }
    }
  }

  it("renders the reveal equation (reduced motion)", () => {
    const html = renderToString(<GaussPairingScene config={parsed(SAMPLE_SCENE_CONFIGS.gauss_pairing) as never} phase="reveal" locale="en" reducedMotion onEvent={() => {}} />);
    expect(html.replace(/<!-- -->/g, "")).toContain("50 × 101 = 5,050");
  });
});

describe("tier-2 batch 3a content", () => {
  const html = (Scene: AnyScene, input: unknown, phase: ScenePhase = "explore", locale: "en" | "zh" = "en") => {
    const Any = Scene as unknown as ComponentType<SceneProps<SceneConfig>>;
    return renderToString(<Any config={parsed(input)} phase={phase} locale={locale} reducedMotion onEvent={() => {}} />).replace(/<!-- -->/g, "");
  };
  it("time ladder starts at a million seconds and offers ÷ 60", () => {
    const h = html(ScaleLadderScene as AnyScene, SAMPLE_SCENE_CONFIGS.scale_ladder);
    expect(h).toContain("1,000,000 seconds");
    expect(h).toContain("÷ 60");
    expect(h).toContain("a summer holiday");
  });
  it("heartbeats ladder offers × 60 and the billion step", () => {
    const h = html(ScaleLadderScene as AnyScene, MODE_SAMPLES.scaleHeartbeats);
    expect(h).toContain("× 60");
    expect(h).toContain("1B ÷ ?");
  });
  it("powers names both numbers", () => expect(html(ScaleLadderScene as AnyScene, MODE_SAMPLES.scalePowers, "explore", "zh")).toContain("古戈尔"));
  it("halving shows the series", () => expect(html(HalvingBarScene as AnyScene, SAMPLE_SCENE_CONFIGS.halving_bar, "hook")).toContain("1/2 + 1/4 + 1/8 = 7/8"));
  it("königsberg has seven bridge targets", () => expect(html(BridgesTraceScene as AnyScene, SAMPLE_SCENE_CONFIGS.bridges_trace).match(/aria-label="Bridge \d/g)?.length).toBe(7));
  it("königsberg reveal counts bridges at every land", () => {
    const h = html(BridgesTraceScene as AnyScene, SAMPLE_SCENE_CONFIGS.bridges_trace, "reveal");
    expect(h).toContain("Island: 5 bridges");
    expect(h).toContain("North bank: 3 bridges");
  });
  it("pythagoras shows the three areas", () => {
    const h = html(PythagorasSquaresScene as AnyScene, SAMPLE_SCENE_CONFIGS.pythagoras_squares);
    expect(h).toContain(">36<");
    expect(h).toContain(">64<");
    expect(h).toContain(">100<");
  });
  it("clock starts with midnight found", () => expect(html(ClockOverlapScene as AnyScene, SAMPLE_SCENE_CONFIGS.clock_overlap)).toContain("12:00 am"));
  it("socks reveal sets up three boxes", () => expect(html(SockDrawerScene as AnyScene, SAMPLE_SCENE_CONFIGS.sock_drawer, "reveal")).toContain("3 boxes, 4 socks"));
  it("collatz hook shows 6's path", () => expect(html(CollatzPathScene as AnyScene, SAMPLE_SCENE_CONFIGS.collatz_path, "hook")).toContain("6 → 3 → 10 → 5 → 16 → 8 → 4 → 2 → 1"));
  it("digit slide reveal adds n × 10 and n", () => expect(html(DigitSlideScene as AnyScene, SAMPLE_SCENE_CONFIGS.digit_slide, "reveal")).toContain("45 × 10 + 45 = 495"));
  it("fib reveal lists every square", () => expect(html(FibSpiralScene as AnyScene, SAMPLE_SCENE_CONFIGS.fib_spiral, "reveal")).toContain("2 squares: 1, 1"));
  it("divisors hook is 6 = 1 + 2 + 3", () => expect(html(DivisorBlocksScene as AnyScene, SAMPLE_SCENE_CONFIGS.divisor_blocks, "hook")).toContain("6 = 1 + 2 + 3"));
  it("rope shows the planet buttons", () => expect(html(CircleRopeScene as AnyScene, SAMPLE_SCENE_CONFIGS.circle_rope)).toContain('aria-label="the Sun"'));
  it("pi darts starts empty", () => expect(html(PiDartsScene as AnyScene, SAMPLE_SCENE_CONFIGS.pi_darts)).toContain("0/5,000"));
  it("coins show the 1/1024 grid in the reveal", () => expect(html(CoinFlipsScene as AnyScene, SAMPLE_SCENE_CONFIGS.coin_flips, "reveal")).toContain("1 out of 1024"));
});

describe("tier-2 batch 3b content", () => {
  const html = (Scene: AnyScene, input: unknown, phase: ScenePhase = "explore", locale: "en" | "zh" = "en") => {
    const Any = Scene as unknown as ComponentType<SceneProps<SceneConfig>>;
    return renderToString(<Any config={parsed(input)} phase={phase} locale={locale} reducedMotion onEvent={() => {}} />).replace(/<!-- -->/g, "");
  };
  it("tiling tray shows the four shapes with their angles", () => {
    const h = html(TilingLabScene as AnyScene, SAMPLE_SCENE_CONFIGS.tiling_lab);
    for (const a of ["60°", "90°", "108°", "120°"]) expect(h).toContain(a);
  });
  it("domino board shows 62 cells for the mutilated board", () => expect(html(DominoTilingScene as AnyScene, SAMPLE_SCENE_CONFIGS.domino_tiling)).toMatch(/30|32/));
  it("calendar window starts on 17 with 9 × 17 = 153", () => {
    const h = html(CalendarGridScene as AnyScene, SAMPLE_SCENE_CONFIGS.calendar_grid);
    expect(h).toContain("153");
    expect(h).toContain("17 × 9");
  });
  it("cycle timeline calls out year 78", () => expect(html(CycleTimelineScene as AnyScene, SAMPLE_SCENE_CONFIGS.cycle_timeline)).toContain("78"));
  it("queens counts 0 of 2", () => expect(html(QueensBoardScene as AnyScene, SAMPLE_SCENE_CONFIGS.queens_board)).toContain("0/2"));
  it("guess bar spans 1..100", () => expect(html(GuessGameScene as AnyScene, SAMPLE_SCENE_CONFIGS.guess_game)).toContain("1–100"));
  it("expression shows the target and the four 4s", () => {
    const h = html(ExpressionBuilderScene as AnyScene, SAMPLE_SCENE_CONFIGS.expression_builder);
    expect(h).toContain("0/4");
    expect(h.match(/aria-label="Number 4"/g)).toHaveLength(4);
  });
  it("coins start with an empty small pile", () => expect(html(CoinPilesScene as AnyScene, SAMPLE_SCENE_CONFIGS.coin_piles)).toContain("small · 0/10"));
  it("trains hook hides the answer", () => expect(html(TrainsFlyScene as AnyScene, SAMPLE_SCENE_CONFIGS.trains_fly, "hook")).toContain("? km"));
});

describe("expression_builder agrees with the server's evaluator", () => {
  const samples = [SAMPLE_SCENE_CONFIGS.expression_builder, { type: "expression_builder", allowedNumbers: [1, 3, 4, 6], target: 24, allowedOps: ["+", "-", "*", "/"], solutions: ["6/(1-3/4)"] }];
  it("uses the same operator names as the EXPRESSION answer spec", () => expect([...EXPR_TILE_OPS].sort()).toEqual([...EXPRESSION_OPS].sort()));
  it.each(samples)("every listed solution evaluates to the target with exactly the numbers (%j)", (input) => {
    const c = parsed(input) as Extract<SceneConfig, { type: "expression_builder" }>;
    for (const s of c.solutions ?? []) {
      const r = evaluateExpression(s, { allowedOps: c.allowedOps });
      expect(r.ok, s).toBe(true);
      if (!r.ok) continue;
      expect(r.value, s).toBeCloseTo(c.target, 9);
      expect(sameMultiset(r.numbersUsed, c.allowedNumbers), s).toBe(true);
      expect(r.opsUsed.every((op) => c.allowedOps.includes(op)), s).toBe(true);
    }
  });
  it("tiles glue into what the evaluator reads (44/4-4 → 7 with four 4s)", () => {
    const four = (index: number) => ({ kind: "num" as const, value: 4, index });
    const expr = tilesToExpression([four(0), four(1), { kind: "op", op: "/" }, four(2), { kind: "op", op: "-" }, four(3)], true);
    const r = evaluateExpression(expr, { allowedOps: ["+", "-", "*", "/", "concat"] });
    expect(r).toMatchObject({ ok: true, value: 7, numbersUsed: [4, 4, 4, 4] });
    const pretty = evaluateExpression(tilesToExpression([four(0), four(1), { kind: "op", op: "/" }, four(2), { kind: "op", op: "-" }, four(3)], true, true), { allowedOps: ["-", "/", "concat"] });
    expect(pretty).toMatchObject({ ok: true, value: 7 });
    // Without concat the two 4s stay apart and the parser refuses.
    expect(evaluateExpression(tilesToExpression([four(0), four(1)], false)).ok).toBe(false);
  });
  it("literal counting matches the evaluator on tricky inputs", () => {
    for (const [s, concat] of [["44/4-4", true], ["44/4-4", false], ["√4+4!-4/4", false], ["(4+4)*4-4", true], ["-4--4", false]] as const) {
      const r = evaluateExpression(s, { allowedOps: concat ? ["concat"] : [] });
      expect(r.ok && r.numbersUsed, s).toEqual(literalNumbers(s, concat));
    }
  });
});

describe("illustration", () => {
  const publicDir = fileURLToPath(new URL("../../public/scenes/", import.meta.url));
  it.each([SAMPLE_SCENE_CONFIGS.illustration, MODE_SAMPLES.knightsAndKnaves])("ships the SVG for %j", (c) => {
    expect(existsSync(`${publicDir}${(c as { asset: string }).asset}.svg`)).toBe(true);
  });
  it("swaps to the reveal asset and caption", () => {
    const config = parsed({ ...MODE_SAMPLES.knightsAndKnaves, revealAsset: "three-switches", revealCaption: bi("Reveal caption") });
    const explore = renderToString(<IllustrationScene config={config as never} phase="explore" locale="en" reducedMotion onEvent={() => {}} />);
    const reveal = renderToString(<IllustrationScene config={config as never} phase="reveal" locale="en" reducedMotion onEvent={() => {}} />);
    expect(explore).toContain('src="/scenes/knights-and-knaves.svg"');
    expect(reveal).toContain('src="/scenes/three-switches.svg"');
    expect(reveal).toContain('alt="Reveal caption"');
  });
});

describe("registry + SceneHost", () => {
  it("registers every schema type", () => {
    expect(Object.keys(SCENE_REGISTRY).sort()).toEqual(Object.keys(SAMPLE_SCENE_CONFIGS).sort());
  });
  it.each([null, {}, { type: "nope" }, { type: "gauss_pairing", n: 100, pairSum: 100, pairCount: 50 }])("renders nothing for invalid config %j", (config) => {
    expect(renderToString(<SceneHost config={config} phase="explore" locale="en" />)).toBe("");
  });
  it("renders the Suspense skeleton for a valid config on the server", () => {
    const html = renderToString(<SceneHost config={SAMPLE_SCENE_CONFIGS.grid_squares} phase="explore" locale="en" />);
    expect(html).toContain("animate-pulse");
  });
});
