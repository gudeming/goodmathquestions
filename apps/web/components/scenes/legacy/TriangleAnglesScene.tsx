"use client";

// Legacy v1 scene (DRILL questions only). Moved verbatim from components/animations/MathAnimation.tsx;
// frozen per 03-scene-catalog.md §5. Only the SceneProps adapter below is new.
import { arc as d3Arc, line as d3Line } from "d3";
import type { AnimationScene, SceneConfigOf, SceneProps } from "@gmq/animation-engine";
import { useLegacyScene } from "./useLegacyScene";

export default function TriangleAnglesScene({ config, phase }: SceneProps<SceneConfigOf<"triangle_angles">>) {
  const scene = useLegacyScene(config);
  return <TriangleAnimation scene={scene} revealSolution={phase === "reveal"} />;
}

function TriangleAnimation({
  scene,
  revealSolution,
}: {
  scene: AnimationScene;
  revealSolution: boolean;
}) {
  const triangle = scene.objects.find((o) => o.id === "triangle");
  const angles = (scene.metadata?.angles as number[]) ?? triangle?.properties?.angles ?? [60, 60, 60];
  const displayAngles: Array<number | string> = [...angles];
  if (!revealSolution && displayAngles.length >= 3) {
    displayAngles[2] = "?";
  }
  const points: Array<[number, number]> = [
    [110, 26],
    [30, 184],
    [190, 184],
  ];
  const trianglePath =
    d3Line<[number, number]>()
      .x((d) => d[0])
      .y((d) => d[1])([...points, points[0]]) ?? "";
  const arcPath = d3Arc();
  const arcWedges = [
    { cx: 110, cy: 26, start: (62 * Math.PI) / 180, end: (118 * Math.PI) / 180, color: "#93c5fd" },
    { cx: 30, cy: 184, start: (-38 * Math.PI) / 180, end: (0 * Math.PI) / 180, color: "#bfdbfe" },
    { cx: 190, cy: 184, start: Math.PI, end: (218 * Math.PI) / 180, color: "#fbcfe8" },
  ];

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 220" className="w-64 h-64">
        <defs>
          <pattern id="geo-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect x={0} y={0} width={220} height={220} fill="url(#geo-grid)" />
        <path d={trianglePath} fill="#eff6ff" stroke="#2563eb" strokeWidth="4" />
        {arcWedges.map((a, idx) => (
          <g key={idx} transform={`translate(${a.cx},${a.cy})`}>
            <path
              d={arcPath({
                innerRadius: 8,
                outerRadius: 22,
                startAngle: a.start,
                endAngle: a.end,
              }) ?? ""}
              fill={a.color}
              opacity={0.75}
            />
          </g>
        ))}
        <text x="102" y="60" className="fill-blue-700 font-bold text-sm">{displayAngles[1]}{displayAngles[1] === "?" ? "" : "°"}</text>
        <text x="42" y="172" className="fill-blue-700 font-bold text-sm">{displayAngles[0]}{displayAngles[0] === "?" ? "" : "°"}</text>
        <text x="154" y="172" className="fill-pink-600 font-bold text-sm">{displayAngles[2]}{displayAngles[2] === "?" ? "" : "°"}</text>
      </svg>
      <p className="text-xs text-gray-500">Sum of angles in a triangle = 180°</p>
    </div>
  );
}
