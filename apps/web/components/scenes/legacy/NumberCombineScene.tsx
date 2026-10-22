"use client";

// Legacy v1 scene (DRILL questions only). Moved verbatim from components/animations/MathAnimation.tsx;
// frozen per 03-scene-catalog.md §5. Only the SceneProps adapter below is new.
import { motion } from "framer-motion";
import { scaleLinear } from "d3";
import type { AnimationScene, SceneConfigOf, SceneProps } from "@gmq/animation-engine";
import { useLegacyScene } from "./useLegacyScene";

export default function NumberCombineScene({ config, phase }: SceneProps<SceneConfigOf<"number_combine">>) {
  const scene = useLegacyScene(config);
  return <NumberCombineAnimation scene={scene} revealSolution={phase === "reveal"} />;
}

function ProfessionalNumberCombineDiagram({
  numbers,
  operation,
}: {
  numbers: number[];
  operation: string;
}) {
  const isPerimeterRect =
    operation === "add" &&
    numbers.length === 4 &&
    numbers[0] === numbers[2] &&
    numbers[1] === numbers[3];
  const isAreaRect = operation === "multiply" && numbers.length === 2;
  const isVolumePrism = operation === "multiply" && numbers.length === 3;

  if (!isPerimeterRect && !isAreaRect && !isVolumePrism) {
    return null;
  }

  if (isPerimeterRect || isAreaRect) {
    const a = numbers[0];
    const b = numbers[1];
    const xScale = scaleLinear().domain([0, Math.max(a, b)]).range([0, 170]);
    const w = Math.max(56, xScale(a));
    const h = Math.max(40, xScale(b));
    return (
      <div className="rounded-xl border border-primary-100 bg-white p-3">
        <svg viewBox="0 0 260 170" className="w-full h-44">
          <rect x={36} y={24} width={w} height={h} fill="#dbeafe" stroke="#2563eb" strokeWidth={3} rx={4} />
          <line x1={36} y1={24 + h + 20} x2={36 + w} y2={24 + h + 20} stroke="#64748b" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
          <line x1={36 + w + 20} y1={24} x2={36 + w + 20} y2={24 + h} stroke="#64748b" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#64748b" />
            </marker>
          </defs>
          <text x={36 + w / 2} y={24 + h + 40} textAnchor="middle" className="fill-slate-700 text-[12px] font-semibold">{a}</text>
          <text x={36 + w + 34} y={24 + h / 2 + 4} textAnchor="middle" className="fill-slate-700 text-[12px] font-semibold">{b}</text>
          <text x={170} y={42} className="fill-slate-500 text-[12px]">
            {isPerimeterRect ? "Perimeter model" : "Area model"}
          </text>
        </svg>
      </div>
    );
  }

  const [l, w, h] = numbers;
  return (
    <div className="rounded-xl border border-primary-100 bg-white p-3">
      <svg viewBox="0 0 280 190" className="w-full h-44">
        <polygon points="40,130 140,130 190,95 90,95" fill="#dbeafe" stroke="#1d4ed8" strokeWidth={2.5} />
        <polygon points="140,130 140,60 190,25 190,95" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth={2.5} />
        <polygon points="40,130 40,60 140,60 140,130" fill="#eff6ff" stroke="#1d4ed8" strokeWidth={2.5} />
        <text x={90} y={146} className="fill-slate-700 text-[12px] font-semibold">{l}</text>
        <text x={156} y={112} className="fill-slate-700 text-[12px] font-semibold">{w}</text>
        <text x={28} y={96} className="fill-slate-700 text-[12px] font-semibold">{h}</text>
        <text x={208} y={42} className="fill-slate-500 text-[12px]">Volume prism model</text>
      </svg>
    </div>
  );
}
function NumberCombineAnimation({
  scene,
  revealSolution,
}: {
  scene: AnimationScene;
  revealSolution: boolean;
}) {
  const numbers = (scene.metadata?.numbers as number[]) ?? [];
  const operation = String(scene.metadata?.operation ?? "add");

  const result =
    operation === "multiply"
      ? numbers.reduce((acc, n) => acc * n, 1)
      : numbers.reduce((acc, n) => acc + n, 0);

  return (
    <div className="space-y-4">
      <ProfessionalNumberCombineDiagram numbers={numbers} operation={operation} />
      <div className="grid grid-cols-4 gap-2">
        {numbers.map((n, i) => (
          <motion.div
            key={`${n}-${i}`}
            className="rounded-xl border border-primary-100 bg-white p-3 text-center font-heading font-bold text-primary-700"
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.06 }}
          >
            {n}
          </motion.div>
        ))}
      </div>
      <div className="rounded-xl bg-primary-50 p-3 text-center">
        <p className="text-xs uppercase tracking-wide text-gray-500">Operation: {operation}</p>
        <p className="text-xl font-heading font-bold text-primary-700">
          Result: {revealSolution ? result : "?"}
        </p>
      </div>
    </div>
  );
}
