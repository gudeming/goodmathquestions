"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

const SYMBOLS = [
  "+", "-", "×", "÷", "=", "π", "∞", "√", "Σ", "∫",
  "△", "○", "□", "%", "≠", "≤", "≥", "∈", "∪", "∩",
];

const COLORS = [
  "text-fun-pink",
  "text-fun-purple",
  "text-fun-cyan",
  "text-fun-green",
  "text-fun-yellow",
  "text-fun-orange",
  "text-primary-400",
];

interface FloatingSymbol {
  symbol: string;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

export function FloatingMathSymbols() {
  const symbols = useMemo(() => {
    const items: FloatingSymbol[] = [];
    for (let i = 0; i < 20; i++) {
      items.push({
        symbol: SYMBOLS[i % SYMBOLS.length],
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 16 + Math.random() * 32,
        color: COLORS[i % COLORS.length],
        duration: 15 + Math.random() * 20,
        delay: Math.random() * 5,
      });
    }
    return items;
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {symbols.map((sym, i) => (
        <motion.span
          key={i}
          className={`absolute font-mono font-bold opacity-10 select-none ${sym.color}`}
          style={{
            left: `${sym.x}%`,
            top: `${sym.y}%`,
            fontSize: `${sym.size}px`,
          }}
          animate={{
            y: [0, -30, 0, 30, 0],
            x: [0, 15, -15, 10, 0],
            rotate: [0, 10, -10, 5, 0],
          }}
          transition={{
            duration: sym.duration,
            delay: sym.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {sym.symbol}
        </motion.span>
      ))}
    </div>
  );
}
