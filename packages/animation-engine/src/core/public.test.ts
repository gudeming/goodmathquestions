import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ANSWER_FIELDS, publicSceneConfig } from "./public";
import { parseSceneConfig } from "../schema";
import { SAMPLE_SCENE_CONFIGS } from "../samples";

describe("publicSceneConfig", () => {
  it("removes the answer fields and keeps the config valid", () => {
    for (const [type, fields] of Object.entries(ANSWER_FIELDS)) {
      const sample = SAMPLE_SCENE_CONFIGS[type as keyof typeof SAMPLE_SCENE_CONFIGS] as Record<string, unknown>;
      const pub = publicSceneConfig(sample) as Record<string, unknown>;
      for (const f of fields!) expect(pub, `${type}.${f}`).not.toHaveProperty(f);
      expect(parseSceneConfig(pub).ok, type).toBe(true);
    }
  });

  it("leaves other scenes and non-objects alone, and never mutates its input", () => {
    const hand = { type: "handshake_graph", people: 10 };
    expect(publicSceneConfig(hand)).toBe(hand);
    expect(publicSceneConfig(null)).toBeNull();
    expect(publicSceneConfig({})).toEqual({});
    const clock = { type: "clock_overlap", hours: 24, overlaps: 22 };
    expect(publicSceneConfig(clock)).toEqual({ type: "clock_overlap", hours: 24 });
    expect(clock.overlaps).toBe(22);
  });

  it("lists every field the schemas mark 'Answer-bearing' (so a new one can't slip out to clients)", () => {
    const marked: string[] = [];
    for (const file of ["../schema.ts", "../schema-tier2a.ts", "../schema-tier2b.ts"]) {
      const lines = readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8").split("\n");
      lines.forEach((line, i) => {
        if (!/Answer-bearing/.test(line)) return;
        const field = lines[i + 1]?.match(/^\s*(\w+):/)?.[1];
        if (field) marked.push(field);
      });
    }
    const listed = new Set(Object.values(ANSWER_FIELDS).flat());
    const exempt = new Set(["highlight"]); // divisor_blocks: the explore game needs it
    expect(marked.filter((f) => !listed.has(f) && !exempt.has(f))).toEqual([]);
  });
});
