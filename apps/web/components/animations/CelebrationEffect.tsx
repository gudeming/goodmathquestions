"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo } from "react";

interface CelebrationEffectProps {
  xp: number;
}

export function CelebrationEffect({ xp }: CelebrationEffectProps) {
  const particles = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 10 + Math.random() * 20,
      color: [
        "#ff6b9d",
        "#fbbf24",
        "#4ade80",
        "#60a5fa",
        "#c084fc",
        "#fb923c",
        "#22d3ee",
      ][i % 7],
      emoji: ["🌟", "⭐", "✨", "🎉", "🎊", "💫", "🏆"][i % 7],
      delay: Math.random() * 0.5,
    }));
  }, []);

  // Try to use canvas-confetti if available
  useEffect(() => {
    try {
      import("canvas-confetti").then((confetti) => {
        confetti.default({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#ff6b9d", "#fbbf24", "#4ade80", "#60a5fa", "#c084fc"],
        });
      });
    } catch {
      // Fallback to CSS-based celebration
    }
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Confetti particles */}
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute text-2xl select-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.size}px`,
          }}
          initial={{ opacity: 0, scale: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, 1.5, 1, 0.5],
            y: [0, -100 - Math.random() * 200],
            x: [(Math.random() - 0.5) * 200],
            rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
          }}
          transition={{
            duration: 2,
            delay: p.delay,
            ease: "easeOut",
          }}
        >
          {p.emoji}
        </motion.span>
      ))}

      {/* XP Badge */}
      <motion.div
        className="bg-gradient-to-r from-fun-yellow to-fun-orange text-white
                    rounded-bubble px-8 py-4 shadow-2xl text-center"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 20 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 15,
          delay: 0.3,
        }}
      >
        <div className="text-4xl mb-1">🎉</div>
        <div className="text-2xl font-heading font-bold">+{xp} XP</div>
        <div className="text-sm font-body opacity-90">Amazing work!</div>
      </motion.div>
    </motion.div>
  );
}
