"use client";

// Legacy v1 scene (DRILL questions only). Moved verbatim from components/animations/MathAnimation.tsx;
// frozen per 03-scene-catalog.md §5. Only the SceneProps adapter below is new.
import { motion } from "framer-motion";
import { useState } from "react";
import type { AnimationScene, SceneConfigOf, SceneProps } from "@gmq/animation-engine";
import { useLegacyScene } from "./useLegacyScene";
import { tr, type SceneLocale } from "../primitives";

export default function PizzaSliceScene({ config, phase, locale }: SceneProps<SceneConfigOf<"pizza_slice">>) {
  const scene = useLegacyScene(config);
  return <PizzaAnimation scene={scene} locale={locale} />;
}

function PizzaAnimation({ scene, locale }: { scene: AnimationScene; locale: SceneLocale }) {
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
        {tr(locale, `Click remaining slices: ${selected.length} selected`, `点剩下的披萨块：已选 ${selected.length} 块`)}
      </p>
      <p className="text-xs text-gray-400">
        {tr(locale, `Remaining fraction: ${total - eaten}/${total}`, `还剩：${total - eaten}/${total}`)}
      </p>
    </div>
  );
}
