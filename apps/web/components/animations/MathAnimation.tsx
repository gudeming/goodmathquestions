"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { arc as d3Arc, line as d3Line, scaleLinear } from "d3";
import {
  SceneBuilder,
  type AnimationConfig,
  type AnimationScene,
} from "@gmq/animation-engine";

interface MathAnimationProps {
  config: AnimationConfig;
  revealSolution?: boolean;
}

export function MathAnimation({ config, revealSolution = false }: MathAnimationProps) {
  const scene = useMemo(() => SceneBuilder.build(config), [config]);

  switch (scene.type) {
    case "pizza_slice":
      return <PizzaAnimation scene={scene} />;
    case "balance_scale":
      return <BalanceScaleAnimation scene={scene} revealSolution={revealSolution} />;
    case "number_journey":
      return <NumberJourneyAnimation scene={scene} revealSolution={revealSolution} />;
    case "triangle_angles":
      return <TriangleAnimation scene={scene} revealSolution={revealSolution} />;
    case "candy_jar":
      return <CandyJarAnimation scene={scene} />;
    case "staircase":
      return <StaircaseAnimation scene={scene} />;
    case "magic_square":
      return <MagicSquareAnimation scene={scene} />;
    case "number_combine":
      return <NumberCombineAnimation scene={scene} revealSolution={revealSolution} />;
    default:
      return <DefaultAnimation type={scene.type} />;
  }
}

function PizzaAnimation({ scene }: { scene: AnimationScene }) {
  const total = Number(scene.metadata?.totalSlices ?? 8);
  const eaten = Number(scene.metadata?.eatenSlices ?? 0);
  const [selected, setSelected] = useState<number[]>([]);

  const angle = 360 / total;
  const radius = 86;
  const center = 100;

  const path = (index: number) => {
    const start = (index * angle - 90) * (Math.PI / 180);
    const end = ((index + 1) * angle - 90) * (Math.PI / 180);
    const x1 = center + radius * Math.cos(start);
    const y1 = center + radius * Math.sin(start);
    const x2 = center + radius * Math.cos(end);
    const y2 = center + radius * Math.sin(end);
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${angle > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
  };

  const toggle = (i: number) => {
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((v) => v !== i) : [...prev, i]
    );
  };

  const colors = ["#ff6b9d", "#fbbf24", "#4ade80", "#60a5fa", "#c084fc", "#fb923c"];

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 200" className="w-64 h-64">
        <circle cx={center} cy={center} r={radius + 3} fill="#f5deb3" stroke="#d4a574" strokeWidth="4" />
        {Array.from({ length: total }).map((_, i) => {
          const isEaten = i < eaten;
          const isSelected = selected.includes(i);
          return (
            <motion.path
              key={i}
              d={path(i)}
              fill={isEaten ? "#f3f4f6" : colors[i % colors.length]}
              stroke="#ffffff"
              strokeWidth="2"
              onClick={() => !isEaten && toggle(i)}
              animate={{
                scale: isSelected ? 1.04 : 1,
                opacity: isEaten ? 0.45 : 1,
              }}
              whileHover={!isEaten ? { scale: 1.02 } : undefined}
              style={{ transformOrigin: `${center}px ${center}px`, cursor: isEaten ? "default" : "pointer" }}
            />
          );
        })}
      </svg>
      <p className="text-sm font-heading text-gray-600 mt-2">
        Click remaining slices: {selected.length} selected
      </p>
      <p className="text-xs text-gray-400">
        Remaining fraction: {total - eaten}/{total}
      </p>
    </div>
  );
}

function BalanceScaleAnimation({
  scene,
  revealSolution,
}: {
  scene: AnimationScene;
  revealSolution: boolean;
}) {
  const rightValue =
    typeof scene.metadata?.rightValue === "number" ? scene.metadata.rightValue : null;
  const leftExpression = String(scene.metadata?.leftExpression ?? "x");
  const [guess, setGuess] = useState(0);

  const tilt = rightValue == null ? 0 : Math.max(-10, Math.min(10, (rightValue - guess) * 0.5));
  const balanced = rightValue != null && guess === rightValue;

  return (
    <div className="flex flex-col items-center py-4">
      <svg viewBox="0 0 320 210" className="w-full max-w-md">
        <line x1="160" y1="30" x2="160" y2="175" stroke="#8B7355" strokeWidth="6" strokeLinecap="round" />
        <rect x="120" y="172" width="80" height="14" rx="5" fill="#8B7355" />

        <motion.g animate={{ rotate: tilt }} style={{ originX: "160px", originY: "70px" }}>
          <line x1="45" y1="70" x2="275" y2="70" stroke="#D4A574" strokeWidth="5" strokeLinecap="round" />

          <line x1="60" y1="70" x2="60" y2="105" stroke="#a1a1aa" strokeWidth="2" />
          <path d="M 30 105 Q 60 117 90 105" fill="none" stroke="#D4A574" strokeWidth="3" />

          <line x1="260" y1="70" x2="260" y2="105" stroke="#a1a1aa" strokeWidth="2" />
          <path d="M 230 105 Q 260 117 290 105" fill="none" stroke="#D4A574" strokeWidth="3" />
        </motion.g>

        <text x="60" y="102" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#2563eb">
          {leftExpression}
        </text>
        <text x="260" y="102" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#f59e0b">
          {revealSolution ? rightValue ?? "?" : "?"}
        </text>
      </svg>

      <div className="w-full max-w-sm mt-3 space-y-2">
        <label className="text-xs text-gray-500 font-heading">Adjust value to balance:</label>
        <input
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-center font-mono"
          type="number"
          value={guess}
          onChange={(e) => setGuess(Number(e.target.value || 0))}
        />
        <p className={`text-sm font-heading ${balanced ? "text-fun-green" : "text-gray-500"}`}>
          {balanced ? "Balanced!" : "Not balanced yet"}
        </p>
      </div>
    </div>
  );
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

function CandyJarAnimation({ scene }: { scene: AnimationScene }) {
  const totals = (scene.metadata?.totals ?? {}) as Record<string, number>;
  const colors = Object.keys(totals);
  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0] ?? null);

  const colorMap: Record<string, string> = {
    red: "#f87171",
    blue: "#60a5fa",
    green: "#4ade80",
  };

  return (
    <div className="space-y-4">
      <div className="mx-auto grid w-full max-w-xs grid-cols-5 gap-2 rounded-2xl border border-primary-100 bg-white p-4">
        {scene.objects.map((obj) => {
          const fill = String(obj.properties.fill ?? "#d1d5db");
          const active = selectedColor ? fill === colorMap[selectedColor] : true;
          return (
            <motion.div
              key={obj.id}
              className="h-7 w-7 rounded-full"
              style={{ backgroundColor: fill }}
              animate={{ opacity: active ? 1 : 0.2, scale: active ? 1 : 0.9 }}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setSelectedColor(color)}
            className={`rounded-full px-3 py-1 text-xs font-heading ${selectedColor === color ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {color}: {totals[color]}
          </button>
        ))}
      </div>
    </div>
  );
}

function StaircaseAnimation({ scene }: { scene: AnimationScene }) {
  const totalStairs = Number(scene.metadata?.totalStairs ?? 4);
  const stepOptions = (scene.metadata?.stepOptions as number[]) ?? [1, 2];
  const [position, setPosition] = useState(0);

  const step = (size: number) => setPosition((prev) => Math.min(totalStairs, prev + size));

  return (
    <div className="space-y-4">
      <div className="flex h-40 items-end gap-1">
        {Array.from({ length: totalStairs }).map((_, i) => (
          <div
            key={i}
            className={`w-14 rounded-t-md border border-blue-200 ${i < position ? "bg-fun-green/50" : "bg-primary-100"}`}
            style={{ height: `${32 + i * 18}px` }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        {stepOptions.map((size) => (
          <button
            key={size}
            type="button"
            className="rounded-full bg-primary-500 px-3 py-1 text-xs text-white"
            onClick={() => step(size)}
            disabled={position >= totalStairs}
          >
            +{size} step
          </button>
        ))}
        <button
          type="button"
          className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
          onClick={() => setPosition(0)}
        >
          Reset
        </button>
      </div>
      <p className="text-xs text-gray-500">Reached stair {position} / {totalStairs}</p>
    </div>
  );
}

function MagicSquareAnimation({ scene }: { scene: AnimationScene }) {
  const size = Number(scene.metadata?.size ?? 3);
  const target = Number(scene.metadata?.targetSum ?? 15);
  const known = (scene.metadata?.known ?? {}) as Record<string, number>;

  const initial = Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size);
    const col = index % size;
    const key = `${row},${col}`;
    return known[key] != null ? String(known[key]) : "";
  });

  const [cells, setCells] = useState<string[]>(initial);

  return (
    <div className="space-y-3">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {cells.map((value, index) => {
          const isKnown = initial[index] !== "";
          return (
            <input
              key={index}
              value={value}
              disabled={isKnown}
              onChange={(e) => {
                const next = [...cells];
                next[index] = e.target.value.replace(/[^0-9]/g, "");
                setCells(next);
              }}
              className={`h-12 rounded-lg border text-center font-mono text-lg ${isKnown ? "bg-fun-green/15 border-fun-green/40" : "border-gray-200"}`}
            />
          );
        })}
      </div>
      <p className="text-xs text-gray-500">Try to make each row/column sum to {target}</p>
    </div>
  );
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

function DefaultAnimation({ type }: { type: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <motion.div
        className="text-center"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      >
        <div className="text-5xl">🧮</div>
        <p className="text-xs text-gray-500 mt-2">Animation type: {type}</p>
      </motion.div>
    </div>
  );
}
