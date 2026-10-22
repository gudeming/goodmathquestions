"use client";

// Legacy v1 scene (DRILL questions only). Moved verbatim from components/animations/MathAnimation.tsx;
// frozen per 03-scene-catalog.md §5. Only the SceneProps adapter below is new.
import { useState } from "react";
import type { AnimationScene, SceneConfigOf, SceneProps } from "@gmq/animation-engine";
import { useLegacyScene } from "./useLegacyScene";
import { tr, type SceneLocale } from "../primitives";

export default function StaircaseScene({ config, phase, locale }: SceneProps<SceneConfigOf<"staircase">>) {
  const scene = useLegacyScene(config);
  return <StaircaseAnimation scene={scene} locale={locale} />;
}

function StaircaseAnimation({ scene, locale }: { scene: AnimationScene; locale: SceneLocale }) {
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
            {tr(locale, `+${size} step${size > 1 ? "s" : ""}`, `上 ${size} 级`)}
          </button>
        ))}
        <button
          type="button"
          className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
          onClick={() => setPosition(0)}
        >
          {tr(locale, "Reset", "重来")}
        </button>
      </div>
      <p className="text-xs text-gray-500">{tr(locale, `Reached stair ${position} / ${totalStairs}`, `到了第 ${position} 级 / 共 ${totalStairs} 级`)}</p>
    </div>
  );
}
