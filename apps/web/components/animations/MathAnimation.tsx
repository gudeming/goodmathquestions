"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface AnimationConfig {
  type: string;
  totalSlices?: number;
  eatenSlices?: number;
  colors?: string[];
  [key: string]: any;
}

interface MathAnimationProps {
  config: AnimationConfig;
}

export function MathAnimation({ config }: MathAnimationProps) {
  switch (config.type) {
    case "pizza_slice":
      return <PizzaAnimation config={config} />;
    case "balance_scale":
      return <BalanceScaleAnimation config={config} />;
    case "number_journey":
      return <NumberJourneyAnimation config={config} />;
    default:
      return <DefaultAnimation config={config} />;
  }
}

// Pizza / Fraction Animation
function PizzaAnimation({ config }: { config: AnimationConfig }) {
  const totalSlices = config.totalSlices || 8;
  const eatenSlices = config.eatenSlices || 3;
  const [animationStep, setAnimationStep] = useState(0);

  const sliceAngle = 360 / totalSlices;
  const radius = 80;
  const center = 100;

  const getSlicePath = (index: number) => {
    const startAngle = (index * sliceAngle - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * sliceAngle - 90) * (Math.PI / 180);

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const largeArcFlag = sliceAngle > 180 ? 1 : 0;

    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const sliceColors = [
    "#ff6b9d", "#fbbf24", "#4ade80", "#60a5fa",
    "#c084fc", "#fb923c", "#22d3ee", "#f87171",
  ];

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 200" className="w-64 h-64">
        {/* Pizza base */}
        <circle
          cx={center}
          cy={center}
          r={radius + 2}
          fill="#f5deb3"
          stroke="#d4a574"
          strokeWidth="3"
        />

        {/* Pizza slices */}
        {Array.from({ length: totalSlices }).map((_, i) => {
          const isEaten = i < eatenSlices;
          return (
            <motion.path
              key={i}
              d={getSlicePath(i)}
              fill={isEaten ? "transparent" : sliceColors[i % sliceColors.length]}
              stroke="#fff"
              strokeWidth="2"
              initial={{ opacity: 1, scale: 1 }}
              animate={
                isEaten
                  ? {
                      opacity: 0.15,
                      scale: 0.95,
                    }
                  : { opacity: 1, scale: 1 }
              }
              transition={{ delay: isEaten ? i * 0.3 : 0, duration: 0.5 }}
              style={{ transformOrigin: `${center}px ${center}px` }}
            />
          );
        })}

        {/* Pepperoni dots on remaining slices */}
        {Array.from({ length: totalSlices }).map((_, i) => {
          if (i < eatenSlices) return null;
          const midAngle =
            ((i + 0.5) * sliceAngle - 90) * (Math.PI / 180);
          const dotR = radius * 0.6;
          const cx = center + dotR * Math.cos(midAngle);
          const cy = center + dotR * Math.sin(midAngle);
          return (
            <motion.circle
              key={`dot-${i}`}
              cx={cx}
              cy={cy}
              r="5"
              fill="#c0392b"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            />
          );
        })}
      </svg>

      {/* Fraction display */}
      <motion.div
        className="mt-4 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        <div className="flex items-center justify-center gap-4 text-2xl font-heading font-bold">
          <motion.span
            className="text-fun-green"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, delay: 2 }}
          >
            {totalSlices - eatenSlices}
          </motion.span>
          <span className="text-gray-400">/</span>
          <span className="text-primary-600">{totalSlices}</span>
          <span className="text-gray-400 text-lg ml-2">
            = {totalSlices - eatenSlices}/{totalSlices}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1 font-body">
          {totalSlices - eatenSlices} slices remaining out of {totalSlices}
        </p>
      </motion.div>
    </div>
  );
}

// Balance Scale Animation (for algebra)
function BalanceScaleAnimation({ config }: { config: AnimationConfig }) {
  return (
    <div className="flex flex-col items-center py-8">
      <svg viewBox="0 0 300 200" className="w-full max-w-md">
        {/* Stand */}
        <motion.line
          x1="150" y1="30" x2="150" y2="170"
          stroke="#8B7355" strokeWidth="6" strokeLinecap="round"
        />
        {/* Base */}
        <motion.rect
          x="110" y="165" width="80" height="15" rx="5"
          fill="#8B7355"
        />
        {/* Beam */}
        <motion.line
          x1="30" y1="60" x2="270" y2="60"
          stroke="#D4A574" strokeWidth="5" strokeLinecap="round"
          initial={{ rotate: 0 }}
          animate={{ rotate: [0, -3, 3, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ transformOrigin: "150px 60px" }}
        />
        {/* Left pan */}
        <motion.g
          animate={{ y: [0, 3, -3, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <line x1="30" y1="60" x2="30" y2="90" stroke="#ccc" strokeWidth="2" />
          <path d="M 0 90 Q 30 100 60 90" fill="none" stroke="#D4A574" strokeWidth="3" />
          <text x="30" y="85" textAnchor="middle" className="font-heading font-bold text-lg" fill="#3b82f6">x</text>
        </motion.g>
        {/* Right pan */}
        <motion.g
          animate={{ y: [0, -3, 3, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <line x1="270" y1="60" x2="270" y2="90" stroke="#ccc" strokeWidth="2" />
          <path d="M 240 90 Q 270 100 300 90" fill="none" stroke="#D4A574" strokeWidth="3" />
          <text x="270" y="85" textAnchor="middle" className="font-heading font-bold text-lg" fill="#f59e0b">7</text>
        </motion.g>
        {/* Fulcrum triangle */}
        <polygon points="140,30 160,30 150,15" fill="#D4A574" />
      </svg>
      <p className="text-center text-gray-500 font-body mt-2">
        What value of x balances the scale?
      </p>
    </div>
  );
}

// Number Journey Animation
function NumberJourneyAnimation({ config }: { config: AnimationConfig }) {
  return (
    <div className="flex flex-col items-center py-8">
      <svg viewBox="0 0 400 100" className="w-full max-w-lg">
        {/* Number line */}
        <line x1="20" y1="50" x2="380" y2="50" stroke="#ddd" strokeWidth="3" />

        {/* Number marks */}
        {Array.from({ length: 21 }).map((_, i) => (
          <g key={i}>
            <line
              x1={20 + i * 18}
              y1="42"
              x2={20 + i * 18}
              y2="58"
              stroke="#aaa"
              strokeWidth="2"
            />
            <text
              x={20 + i * 18}
              y="75"
              textAnchor="middle"
              fill="#666"
              fontSize="10"
              fontFamily="monospace"
            >
              {i}
            </text>
          </g>
        ))}

        {/* Animated jumping character */}
        <motion.g
          animate={{
            x: [0, 36, 72, 108, 144],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatDelay: 2,
            ease: "easeInOut",
          }}
        >
          <motion.circle
            cx="20"
            cy="30"
            r="10"
            fill="#ff6b9d"
            animate={{ y: [0, -15, 0] }}
            transition={{
              duration: 0.4,
              repeat: Infinity,
              repeatDelay: 0.6,
            }}
          />
          <motion.text
            x="20"
            y="34"
            textAnchor="middle"
            fill="white"
            fontSize="10"
            fontWeight="bold"
          >
            😊
          </motion.text>
        </motion.g>
      </svg>
    </div>
  );
}

// Default/fallback animation
function DefaultAnimation({ config }: { config: AnimationConfig }) {
  return (
    <div className="flex items-center justify-center py-12">
      <motion.div
        className="text-6xl"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        🧮
      </motion.div>
    </div>
  );
}
