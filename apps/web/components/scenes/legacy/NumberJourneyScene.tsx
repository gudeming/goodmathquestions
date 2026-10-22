"use client";

// Legacy v1 scene (DRILL questions only). Moved verbatim from components/animations/MathAnimation.tsx;
// frozen per 03-scene-catalog.md §5. Only the SceneProps adapter below is new.
import { useMemo, useState } from "react";
import { scaleLinear } from "d3";
import type { AnimationScene, SceneConfigOf, SceneProps } from "@gmq/animation-engine";
import { useLegacyScene } from "./useLegacyScene";

export default function NumberJourneyScene({ config, phase }: SceneProps<SceneConfigOf<"number_journey">>) {
  const scene = useLegacyScene(config);
  return <NumberJourneyAnimation scene={scene} revealSolution={phase === "reveal"} />;
}

function NumberJourneyAnimation({
  scene,
  revealSolution,
}: {
  scene: AnimationScene;
  revealSolution: boolean;
}) {
  const range = (scene.metadata?.range as [number, number]) ?? [0, 20];
  const highlights = revealSolution ? (scene.metadata?.highlights as number[]) ?? [] : [];
  const [current, setCurrent] = useState(range[0]);

  const min = range[0];
  const max = range[1];
  const ticks = Math.min(24, Math.max(8, max - min + 1));
  const xScale = useMemo(
    () => scaleLinear().domain([min, max]).range([24, 396]),
    [min, max]
  );
  const tickValues = useMemo(() => {
    const count = Math.min(10, Math.max(4, max - min));
    return Array.from({ length: count + 1 }, (_, i) =>
      Math.round(min + ((max - min) * i) / count)
    );
  }, [min, max]);

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl border border-primary-100 bg-white p-4">
        <svg viewBox="0 0 420 120" className="w-full">
          <line x1={24} y1={50} x2={396} y2={50} stroke="#9ca3af" strokeWidth={3} strokeLinecap="round" />
          {tickValues.map((v) => (
            <g key={`tick-${v}`} transform={`translate(${xScale(v)},50)`}>
              <line y1={-7} y2={7} stroke="#64748b" strokeWidth={1.5} />
              <text y={24} textAnchor="middle" className="fill-slate-500 text-[10px]">
                {v}
              </text>
            </g>
          ))}

          {highlights.map((v, idx) => (
            <g key={`h-${v}-${idx}`} transform={`translate(${xScale(v)},50)`}>
              <circle r={9} fill="#fde68a" stroke="#f59e0b" strokeWidth={2} />
              <text y={3} textAnchor="middle" className="fill-amber-700 text-[9px] font-bold">
                {v}
              </text>
            </g>
          ))}

          <g transform={`translate(${xScale(current)},50)`}>
            <circle r={11} fill="#2563eb" />
            <text y={4} textAnchor="middle" className="fill-white text-[10px] font-bold">
              {current}
            </text>
          </g>
        </svg>
        <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${ticks}, minmax(0, 1fr))` }}>
          {Array.from({ length: ticks }).map((_, i) => {
            const value = Math.round(min + ((max - min) * i) / (ticks - 1));
            return (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(value)}
                className={`rounded-md px-1 py-1 text-[11px] font-mono transition ${value === current ? "bg-primary-500 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="font-heading text-gray-500">Current: {current}</span>
        <span className="font-heading text-gray-500">
          Targets: {revealSolution ? highlights.join(", ") : "?"}
        </span>
      </div>
    </div>
  );
}
