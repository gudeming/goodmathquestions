import { describe, expect, it } from "vitest";
import { SceneBuilder } from "./scene-builder";

// Pins the current v1 scene output. The v2 interactive scenes (Phase 2) replace these.
describe("SceneBuilder.build", () => {
  it("renders the inferred default number line as 21 unhighlighted marks", () => {
    const scene = SceneBuilder.build({ type: "number_journey", range: [0, 20], highlights: [] });
    const marks = scene.objects.filter((o) => o.id.startsWith("mark-"));
    expect(scene.type).toBe("number_journey");
    expect(marks).toHaveLength(21);
    expect(marks.every((m) => m.animations.length === 0)).toBe(true);
    expect(scene.metadata).toEqual({ range: [0, 20], highlights: [] });
  });

  it("falls back to range [0, 20] when a number_journey has no range", () => {
    const scene = SceneBuilder.build({ type: "number_journey" });
    expect(scene.metadata?.range).toEqual([0, 20]);
  });

  it("animates only the highlighted marks", () => {
    const scene = SceneBuilder.build({ type: "number_journey", range: [0, 10], highlights: [4, 6] });
    const animated = scene.objects.filter((o) => o.animations.length > 0).map((o) => o.id);
    expect(animated).toEqual(["mark-4", "mark-6"]);
  });

  it("builds a pizza with one arc per slice and tracks the remaining slices", () => {
    const scene = SceneBuilder.build({ type: "pizza_slice", totalSlices: 8, eatenSlices: 3 });
    expect(scene.objects.filter((o) => o.id.startsWith("slice-"))).toHaveLength(8);
    expect(scene.metadata).toEqual({ totalSlices: 8, eatenSlices: 3, remainingSlices: 5 });
  });

  it("defaults a triangle without angles to 60/60/60", () => {
    const scene = SceneBuilder.build({ type: "triangle_angles" });
    expect(scene.metadata).toEqual({ angles: [60, 60, 60] });
  });

  it("exposes the balance scale's right-hand value as the correct interaction value", () => {
    const scene = SceneBuilder.build({
      type: "balance_scale",
      leftSide: { expression: "x + 9" },
      rightSide: { value: 27 },
    });
    expect(scene.metadata).toEqual({ leftExpression: "x + 9", rightValue: 27 });
    expect(scene.interactions?.[0]?.correctValue).toBe(27);
  });
});
