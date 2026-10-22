import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { arc, line, scaleLinear } from "d3";
import { parseSceneConfig, type SceneConfigOf } from "@gmq/animation-engine";
import { linearScale } from "./linear";
import TriangleAnglesScene from "./TriangleAnglesScene";

// The legacy scenes no longer import d3; these pin their output to what d3 produced.

describe("linearScale", () => {
  const cases: Array<[number, number, number, number, number]> = [
    [0, 10, 24, 396, 3.3],
    [-5, 5, 24, 396, 0],
    [0, 0, 0, 170, 5],
    [3, 3, 24, 396, 3],
    [10, 0, 0, 170, 2.5],
    [0, 7, 0, 170, 7],
    [0, 12, 0, 170, 19],
    [1, 3, 10, -10, 1.7],
  ];
  it.each(cases)("domain [%d, %d] range [%d, %d] at %d matches d3", (d0, d1, r0, r1, x) => {
    expect(linearScale(d0, d1, r0, r1)(x)).toBe(scaleLinear().domain([d0, d1]).range([r0, r1])(x));
  });
});

describe("TriangleAnglesScene", () => {
  it("draws the same triangle and wedges as d3 line()/arc()", () => {
    const parsed = parseSceneConfig({ type: "triangle_angles", angles: [50, 60, 70] });
    if (!parsed.ok) throw new Error(parsed.error);
    const html = renderToString(<TriangleAnglesScene config={parsed.config as SceneConfigOf<"triangle_angles">} phase="explore" locale="en" reducedMotion onEvent={() => undefined} />);
    const points: Array<[number, number]> = [[110, 26], [30, 184], [190, 184]];
    expect(html).toContain(`d="${line<[number, number]>().x((d) => d[0]).y((d) => d[1])([...points, points[0]])}"`);
    const deg = Math.PI / 180;
    for (const [start, end] of [[62, 118], [-38, 0], [180, 218]]) {
      expect(html).toContain(`d="${arc()({ innerRadius: 8, outerRadius: 22, startAngle: start * deg, endAngle: end * deg })}"`);
    }
  });
});
