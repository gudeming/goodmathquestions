import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { SAMPLE_SCENE_CONFIGS, parseSceneConfig } from "@gmq/animation-engine";

// Browser path: the client build swaps `scene-parser.ssr` for a null stub, so the
// schemas arrive as an async chunk. Simulate that here.
vi.mock("./scene-parser.ssr", () => ({ SSR_SCENE_PARSER: null }));

const { loadSceneParser, parseScene, peekSceneParser } = await import("./scene-parser");
const { SceneHost } = await import("./SceneHost");
const { hasScene } = await import("@/components/question-v2/scene");

const INVALID_GAUSS = { type: "gauss_pairing", n: 100, pairSum: 100, pairCount: 50 };

describe("scene schemas before the chunk has loaded", () => {
  it("has no parser yet", () => {
    // The module starts loading only in a browser (typeof window !== "undefined").
    expect(peekSceneParser()).toBeNull();
  });

  it("hasScene only checks for a registered type", () => {
    expect(hasScene(SAMPLE_SCENE_CONFIGS.grid_squares)).toBe(true);
    expect(hasScene(INVALID_GAUSS)).toBe(true);
    expect(hasScene({ type: "nope" })).toBe(false);
    expect(hasScene({ type: "toString" })).toBe(false);
    expect(hasScene(null)).toBe(false);
    expect(hasScene([])).toBe(false);
    expect(hasScene({})).toBe(false);
  });

  it("SceneHost shows the skeleton while the schemas load", () => {
    expect(renderToString(<SceneHost config={SAMPLE_SCENE_CONFIGS.grid_squares} phase="explore" locale="en" />)).toContain("animate-pulse");
  });
});

describe("scene schemas after the chunk has loaded", () => {
  it("parses exactly like parseSceneConfig, memoised per config object", async () => {
    const parse = await loadSceneParser();
    expect(peekSceneParser()).toBe(parse);
    for (const config of [...Object.values(SAMPLE_SCENE_CONFIGS), INVALID_GAUSS, { type: "nope" }, null, 3]) {
      expect(parseScene(parse, config)).toEqual(parseSceneConfig(config));
    }
    const config = { ...SAMPLE_SCENE_CONFIGS.grid_squares };
    expect(parseScene(parse, config)).toBe(parseScene(parse, config));
  });

  it("hasScene is exact", () => {
    expect(hasScene(SAMPLE_SCENE_CONFIGS.grid_squares)).toBe(true);
    expect(hasScene(INVALID_GAUSS)).toBe(false);
  });

  it("SceneHost renders nothing for an invalid config and the skeleton for a valid one", () => {
    expect(renderToString(<SceneHost config={INVALID_GAUSS} phase="explore" locale="en" />)).toBe("");
    expect(renderToString(<SceneHost config={SAMPLE_SCENE_CONFIGS.grid_squares} phase="explore" locale="en" />)).toContain("animate-pulse");
  });
});
