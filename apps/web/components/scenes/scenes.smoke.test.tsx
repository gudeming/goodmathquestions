import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { ComponentType } from "react";
import { SAMPLE_SCENE_CONFIGS, TRICK_SAMPLES, parseSceneConfig, type SceneConfig, type ScenePhase, type SceneProps } from "@gmq/animation-engine";
import GaussPairingScene from "./GaussPairingScene";
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

const CASES: Array<[string, ComponentType<SceneProps<never>>, unknown]> = [
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
