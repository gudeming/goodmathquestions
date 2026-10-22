"use client";

// Legacy v1 scene (DRILL questions only). Moved verbatim from components/animations/MathAnimation.tsx;
// frozen per 03-scene-catalog.md §5. Only the SceneProps adapter below is new.
import { useState } from "react";
import type { AnimationScene, SceneConfigOf, SceneProps } from "@gmq/animation-engine";
import { useLegacyScene } from "./useLegacyScene";

export default function MagicSquareScene({ config, phase }: SceneProps<SceneConfigOf<"magic_square">>) {
  const scene = useLegacyScene(config);
  return <MagicSquareAnimation scene={scene} />;
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
