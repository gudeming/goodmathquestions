import { describe, expect, it } from "vitest";
import { Suspense, createElement, type ComponentType } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { Writable } from "node:stream";
import { parseSceneConfig, type SceneConfig, type ScenePhase, type SceneProps } from "@gmq/animation-engine";
import { ALL_HERO_BLUEPRINTS, expandHeroVariants } from "@gmq/db/prisma/hero-questions";
import { SCENE_REGISTRY } from "@/components/scenes/registry";
import { pickNextVariant } from "./VariantPlay";

// Every "try another number" scene must render at its numbers: the build checks the config, this
// checks the component (bad indexing at a board size nobody tried, an off-by-one in a label).

/** SSR that waits for the lazily loaded scene chunk (React 18: renderToString can't). */
function renderAll(el: React.ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = "";
    const sink = new Writable({
      write(chunk, _enc, done) {
        html += chunk.toString();
        done();
      },
    });
    sink.on("finish", () => resolve(html));
    const stream = renderToPipeableStream(el, {
      onAllReady: () => stream.pipe(sink),
      onShellError: reject,
      onError: reject,
    });
  });
}

const PHASES: ScenePhase[] = ["explore", "reveal"];

const cases = ALL_HERO_BLUEPRINTS.flatMap((bp) => expandHeroVariants(bp).map((v) => [`${bp.slug}/${v.id}`, v.scene] as const));

describe("variant scenes SSR", () => {
  it("has variants to check", () => expect(cases.length).toBeGreaterThan(20));

  it.each(cases)("%s renders in explore and reveal (en, zh)", async (_name, input) => {
    const parsed = parseSceneConfig(input);
    expect(parsed.ok).toBe(true);
    const config = (parsed as { ok: true; config: SceneConfig }).config;
    const Scene = SCENE_REGISTRY[config.type] as unknown as ComponentType<SceneProps<SceneConfig>>;
    for (const phase of PHASES) {
      for (const locale of ["en", "zh"] as const) {
        const html = await renderAll(
          createElement(Suspense, { fallback: null }, createElement(Scene, { config, phase, locale, reducedMotion: true, onEvent: () => {} }))
        );
        expect(html).toContain('role="group"');
      }
    }
  });
});

describe("pickNextVariant", () => {
  const ids = ["a", "b", "c"];
  it("never repeats the current one and prefers unsolved", () => {
    for (const r of [0, 0.5, 0.99]) {
      expect(pickNextVariant(ids, new Set(["b"]), "a", () => r)).toBe("c");
      expect(pickNextVariant(ids, new Set(), "a", () => r)).not.toBe("a");
    }
  });
  it("falls back to any other once everything is solved, and handles one or none", () => {
    expect(pickNextVariant(ids, new Set(ids), "c", () => 0)).toBe("a");
    expect(pickNextVariant(["a"], new Set(["a"]), "a", () => 0)).toBe("a");
    expect(pickNextVariant([], new Set(), null)).toBeNull();
  });
});
