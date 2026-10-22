"use client";

// Legacy v1 scene (DRILL questions only). Moved verbatim from components/animations/MathAnimation.tsx;
// frozen per 03-scene-catalog.md §5. Only the SceneProps adapter below is new.
import { motion } from "framer-motion";
import { useState } from "react";
import type { AnimationScene, SceneConfigOf, SceneProps } from "@gmq/animation-engine";
import { useLegacyScene } from "./useLegacyScene";

export default function CandyJarScene({ config, phase }: SceneProps<SceneConfigOf<"candy_jar">>) {
  const scene = useLegacyScene(config);
  return <CandyJarAnimation scene={scene} />;
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
