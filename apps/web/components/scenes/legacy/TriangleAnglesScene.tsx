"use client";

// Legacy v1 scene (DRILL questions only). Moved verbatim from components/animations/MathAnimation.tsx;
// frozen per 03-scene-catalog.md §5. Only the SceneProps adapter below is new.
import type { AnimationScene, SceneConfigOf, SceneProps } from "@gmq/animation-engine";
import { useLegacyScene } from "./useLegacyScene";
import { tr, type SceneLocale } from "../primitives";

export default function TriangleAnglesScene({ config, phase, locale }: SceneProps<SceneConfigOf<"triangle_angles">>) {
  const scene = useLegacyScene(config);
  return <TriangleAnimation scene={scene} revealSolution={phase === "reveal"} locale={locale} />;
}

function TriangleAnimation({
  scene,
  revealSolution,
  locale,
}: {
  scene: AnimationScene;
  revealSolution: boolean;
  locale: SceneLocale;
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
  const trianglePath = `M${[...points, points[0]].map(([x, y]) => `${x},${y}`).join("L")}`;
  // Wedge paths are constants: d3 `arc()({ innerRadius: 8, outerRadius: 22, startAngle, endAngle })`
  // for 62°..118°, -38°..0° and 180°..218°, precomputed so this scene no longer needs d3.
  const arcWedges = [
    { cx: 110, cy: 26, d: "M19.425,-10.328A22,22,0,0,1,19.425,10.328L7.064,3.756A8,8,0,0,0,7.064,-3.756Z", color: "#93c5fd" },
    { cx: 30, cy: 184, d: "M-13.545,-17.336A22,22,0,0,1,0,-22L0,-8A8,8,0,0,0,-4.925,-6.304Z", color: "#bfdbfe" },
    { cx: 190, cy: 184, d: "M0,22A22,22,0,0,1,-13.545,17.336L-4.925,6.304A8,8,0,0,0,0,8Z", color: "#fbcfe8" },
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
              d={a.d}
              fill={a.color}
              opacity={0.75}
            />
          </g>
        ))}
        <text x="102" y="60" className="fill-blue-700 font-bold text-sm">{displayAngles[1]}{displayAngles[1] === "?" ? "" : "°"}</text>
        <text x="42" y="172" className="fill-blue-700 font-bold text-sm">{displayAngles[0]}{displayAngles[0] === "?" ? "" : "°"}</text>
        <text x="154" y="172" className="fill-pink-600 font-bold text-sm">{displayAngles[2]}{displayAngles[2] === "?" ? "" : "°"}</text>
      </svg>
      <p className="text-xs text-gray-500">{tr(locale, "Sum of angles in a triangle = 180°", "三角形的内角和 = 180°")}</p>
    </div>
  );
}
