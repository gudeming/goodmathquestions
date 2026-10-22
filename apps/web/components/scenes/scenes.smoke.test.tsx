import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { ComponentType } from "react";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MODE_SAMPLES, SAMPLE_SCENE_CONFIGS, TRICK_SAMPLES, WOLF_GOAT_CABBAGE, parseSceneConfig, type SceneConfig, type ScenePhase, type SceneProps } from "@gmq/animation-engine";
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
import { SCENE_REGISTRY } from "./registry";
import { SceneHost } from "./SceneHost";

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
