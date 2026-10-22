"use client";

// Legacy v1 scene (DRILL questions only). Moved verbatim from components/animations/MathAnimation.tsx;
// frozen per 03-scene-catalog.md §5. Only the SceneProps adapter below is new.
import { motion } from "framer-motion";
import { useState } from "react";
import type { AnimationScene, SceneConfigOf, SceneProps } from "@gmq/animation-engine";
import { useLegacyScene } from "./useLegacyScene";

export default function BalanceScaleScene({ config, phase }: SceneProps<SceneConfigOf<"balance_scale">>) {
  const scene = useLegacyScene(config);
  return <BalanceScaleAnimation scene={scene} revealSolution={phase === "reveal"} />;
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
