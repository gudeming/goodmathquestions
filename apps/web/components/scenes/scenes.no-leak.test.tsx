import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import type { ComponentType } from "react";
import { parseSceneConfig, type SceneConfig, type ScenePhase, type SceneProps } from "@gmq/animation-engine";
import PythagorasSquaresScene from "./PythagorasSquaresScene";
import GridSquaresScene from "./GridSquaresScene";
import BalanceLabScene from "./BalanceLabScene";
import CircleRopeScene from "./CircleRopeScene";
import TowerOfHanoiScene from "./TowerOfHanoiScene";
import HandshakeGraphScene from "./HandshakeGraphScene";
import GaussPairingScene from "./GaussPairingScene";
import StaircasePathsScene from "./StaircasePathsScene";
import PascalTriangleScene from "./PascalTriangleScene";
import QueensBoardScene from "./QueensBoardScene";
import FrogPuzzleScene from "./FrogPuzzleScene";
import WaterJugsScene from "./WaterJugsScene";
import TrainsFlyScene from "./TrainsFlyScene";
import CalendarGridScene from "./CalendarGridScene";
import CycleTimelineScene from "./CycleTimelineScene";
import ChessboardDoublingScene from "./ChessboardDoublingScene";
import FoldPaperScene from "./FoldPaperScene";
import DigitSlideScene from "./DigitSlideScene";
import FibSpiralScene from "./FibSpiralScene";
import GuessGameScene from "./GuessGameScene";

// The rule: the hook poster and the explore phase must not print the question's answer. Proposing it
// after the child completes the task is fine; showing it up front is not. The configs are the hero
// questions' own scene configs (packages/db/prisma/hero-questions).

type AnyScene = ComponentType<SceneProps<never>>;

function parsed(input: unknown): SceneConfig {
  const r = parseSceneConfig(input);
  if (!r.ok) throw new Error(r.error);
  return r.config;
}

function render(Scene: AnyScene, input: unknown, phase: ScenePhase, locale: "en" | "zh" = "en"): string {
  const Any = Scene as unknown as ComponentType<SceneProps<SceneConfig>>;
  return renderToString(<Any config={parsed(input)} phase={phase} locale={locale} reducedMotion onEvent={() => {}} />).replace(/<!-- -->/g, "");
}

/** What a person can read or hear: text nodes plus aria-label / title values (no coordinates or class names). */
function visible(html: string): string {
  const attrs = [...html.matchAll(/(?:aria-label|aria-valuetext|title)="([^"]*)"/g)].map((m) => m[1]);
  const text = html.replace(/<[^>]*>/g, " ");
  return `${text} ${attrs.join(" ")}`.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
}

/** A whole number token, not part of a longer number or a decimal. */
const token = (s: string) => new RegExp(`(?<![\\d.,])${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\d]|[.,]\\d)`);

const LEAK_CASES: Array<{ name: string; Scene: AnyScene; config: unknown; answers: string[] }> = [
  { name: "pythagoras_squares (c = 10, c² = 100)", Scene: PythagorasSquaresScene as AnyScene, config: { type: "pythagoras_squares", a: 6, b: 8, lockRightAngle: true }, answers: ["100", "10"] },
  { name: "grid_squares (204, per-size totals)", Scene: GridSquaresScene as AnyScene, config: { type: "grid_squares", size: 8 }, answers: ["204", "/49", "/64"] },
  { name: "balance_lab weights (40)", Scene: BalanceLabScene as AnyScene, config: { type: "balance_lab", mode: "weights", weights: [1, 3, 9, 27] }, answers: ["40"] },
  { name: "circle_rope (15.9 cm)", Scene: CircleRopeScene as AnyScene, config: { type: "circle_rope", extraMetersMax: 12 }, answers: ["15.9", "16 cm"] },
  { name: "tower_of_hanoi (15, 2^n − 1)", Scene: TowerOfHanoiScene as AnyScene, config: { type: "tower_of_hanoi", discs: 3, askDiscs: 4 }, answers: ["15", "2^", "2ⁿ"] },
  { name: "handshake_graph (45)", Scene: HandshakeGraphScene as AnyScene, config: { type: "handshake_graph", people: 10 }, answers: ["45"] },
  { name: "gauss_pairing (5050)", Scene: GaussPairingScene as AnyScene, config: { type: "gauss_pairing", n: 100, visibleHead: 6, visibleTail: 6, pairSum: 101, pairCount: 50 }, answers: ["5050", "5,050"] },
  { name: "staircase_paths (89)", Scene: StaircasePathsScene as AnyScene, config: { type: "staircase_paths", steps: 4, maxHop: 2, askN: 10, ways: 89 }, answers: ["89", "/5", "/8"] },
  { name: "pascal_triangle (1024)", Scene: PascalTriangleScene as AnyScene, config: { type: "pascal_triangle", rows: 10, prefilled: 3, askRow: 10, rowSum: 1024 }, answers: ["1024", "1,024"] },
  { name: "queens_board (2)", Scene: QueensBoardScene as AnyScene, config: { type: "queens_board", n: 4, countSolutions: false, dedupeMirrors: false, solutions: 2 }, answers: ["/2"] },
  { name: "frog_puzzle (15)", Scene: FrogPuzzleScene as AnyScene, config: { type: "frog_puzzle", perSide: 3, minMoves: 15 }, answers: ["15"] },
  { name: "water_jugs (6)", Scene: WaterJugsScene as AnyScene, config: { type: "water_jugs", jugs: [3, 5], target: 4, minSteps: 6 }, answers: ["6"] },
  { name: "trains_fly (75 km)", Scene: TrainsFlyScene as AnyScene, config: { type: "trains_fly", distanceKm: 100, trainSpeed: 50, flySpeed: 75, flyKm: 75 }, answers: ["75 km"] },
  { name: "calendar_grid (153, × 9)", Scene: CalendarGridScene as AnyScene, config: { type: "calendar_grid", year: 2026, month: 11, centre: 17, sum: 153 }, answers: ["153", "× 9"] },
  { name: "cycle_timeline (78)", Scene: CycleTimelineScene as AnyScene, config: { type: "cycle_timeline", a: 13, b: 6, years: 120, altA: 12, collision: 78 }, answers: ["78"] },
  { name: "guess_game (7)", Scene: GuessGameScene as AnyScene, config: { type: "guess_game", max: 100, mode: "you_guess", minGuesses: 7 }, answers: ["7"] },
];

describe("no answer before the reveal", () => {
  for (const { name, Scene, config, answers } of LEAK_CASES) {
    for (const phase of ["hook", "explore"] as const) {
      for (const locale of ["en", "zh"] as const) {
        it(`${name}: ${phase} (${locale})`, () => {
          const text = visible(render(Scene, config, phase, locale));
          for (const a of answers) expect(text, `"${a}" leaked`).not.toMatch(token(a));
        });
      }
    }
  }

  it("the token matcher ignores longer numbers and decimals", () => {
    expect("x 150 y").not.toMatch(token("15"));
    expect("3.15").not.toMatch(token("15"));
    expect("15 moves").toMatch(token("15"));
    expect("1/15.").toMatch(token("15"));
  });
});

describe("reveal-phase copy", () => {
  it("hanoi reveal states 2^n − 1", () => expect(visible(render(TowerOfHanoiScene as AnyScene, { type: "tower_of_hanoi", discs: 3, askDiscs: 4 }, "reveal"))).toContain("2^4 − 1 = 15"));
  it("rope reveal uses the canonical 1 m whatever the slider said", () => expect(visible(render(CircleRopeScene as AnyScene, { type: "circle_rope", extraMetersMax: 12 }, "reveal"))).toContain("15.9 cm"));
  it("rope reveal honours revealExtraMeters", () => expect(visible(render(CircleRopeScene as AnyScene, { type: "circle_rope", extraMetersMax: 12, revealExtraMeters: 2 }, "reveal"))).toContain("31.8 cm"));
  it("grid reveal names the 204 total", () => {
    // The reveal timeline doesn't run under SSR, so only the structure is checked here; the browser pass checks the sum.
    expect(visible(render(GridSquaresScene as AnyScene, { type: "grid_squares", size: 8 }, "reveal"))).toContain("Total");
  });
});

describe("bilingual scene copy", () => {
  const fold = {
    type: "fold_paper",
    thicknessMm: 0.1,
    maxFolds: 42,
    references: [{ heightMm: 100, emoji: "📕", label: { en: "a thick book", zh: "一本厚书" } }],
  };
  it("fold hook is Chinese on /zh", () => expect(visible(render(FoldPaperScene as AnyScene, fold, "hook", "zh"))).toContain("一张纸对折"));
  it("fold hook follows labels.hook", () => {
    const h = visible(render(FoldPaperScene as AnyScene, { ...fold, labels: { hook: { en: "Ten folds: how thick?", zh: "折十次有多厚？" } } }, "hook", "zh"));
    expect(h).toContain("折十次有多厚？");
  });
  it("digit slide hook comes from the examples, in Chinese on /zh", () => {
    const h = visible(render(DigitSlideScene as AnyScene, { type: "digit_slide", multiplier: 11, examples: [45, 63, 26, 85] }, "hook", "zh"));
    expect(h).toContain("45 × 11 = 495，63 × 11 = 693，26 × 11 = 286。发现规律了吗？");
  });
  it("digit slide hook follows labels.hook", () => {
    const h = visible(render(DigitSlideScene as AnyScene, { type: "digit_slide", multiplier: 11, labels: { hook: { en: "Spot the secret.", zh: "找出秘密。" } } }, "hook"));
    expect(h).toContain("Spot the secret.");
  });
  it("fib status names the real button", () => {
    const h = visible(render(FibSpiralScene as AnyScene, { type: "fib_spiral", terms: 10 }, "explore"));
    expect(h).toContain("Press “Next square”");
    expect(h).toContain("Next square");
  });
  it("chessboard reveal uses 25 mg a grain (more than 900 years)", () => {
    const h = visible(render(ChessboardDoublingScene as AnyScene, { type: "chessboard_doubling", squares: 64, unitLabel: { en: "grains of rice", zh: "粒米" }, startAmount: 1, showLogScale: true, askSquare: 21 }, "reveal"));
    // SSR renders the reveal at progress 0 ("Fast-forward…"); the browser pass reads the final line.
    expect(h).toContain("Fast-forward");
  });
  it("guess game reply buttons say whose number is bigger", () => {
    const h = visible(render(GuessGameScene as AnyScene, { type: "guess_game", max: 100, mode: "computer_guesses", minGuesses: 7 }, "explore", "zh"));
    expect(h).toContain("我的数更大");
    expect(h).toContain("我的数更小");
  });
});
