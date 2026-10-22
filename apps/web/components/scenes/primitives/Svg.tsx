"use client";

import { motion } from "framer-motion";
import type { KeyboardEvent, ReactNode } from "react";

/** Responsive SVG canvas that fills the remaining frame height. */
export function SceneSvg({ viewBox, label, children, className = "" }: { viewBox: string; label: string; children: ReactNode; className?: string }) {
  return (
    <svg viewBox={viewBox} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet" className={`h-full w-full ${className}`}>
      {children}
    </svg>
  );
}

interface DotProps {
  x: number;
  y: number;
  r?: number;
  label: string;
  ariaLabel: string;
  fillClass: string;
  selected?: boolean;
  interactive?: boolean;
  onActivate?: () => void;
  onKeyDown?: (e: KeyboardEvent<SVGGElement>) => void;
  dataKey?: string;
}

/** Labelled SVG node with a hit area >= 44 px at typical render sizes; Enter/Space activate. */
export function Dot({ x, y, r = 18, label, ariaLabel, fillClass, selected, interactive = true, onActivate, onKeyDown, dataKey }: DotProps) {
  return (
    <g
      transform={`translate(${x},${y})`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-label={ariaLabel}
      aria-pressed={interactive ? Boolean(selected) : undefined}
      data-key={dataKey}
      className={`outline-none ${interactive ? "cursor-pointer" : ""} [&:focus-visible>circle.ring]:stroke-fun-yellow`}
      onClick={interactive ? onActivate : undefined}
      onKeyDown={(e) => {
        if (interactive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onActivate?.();
        }
        onKeyDown?.(e);
      }}
    >
      <circle r={r + 10} fill="transparent" />
      <circle className="ring" r={r + 4} fill="none" strokeWidth={4} stroke={selected ? "#fbbf24" : "transparent"} />
      <circle r={r} className={`${fillClass} stroke-white`} strokeWidth={3} />
      <text textAnchor="middle" dy="0.35em" className="fill-white text-[13px] font-bold" style={{ pointerEvents: "none" }}>
        {label}
      </text>
    </g>
  );
}

/** Straight edge that fades/draws in. */
export function Edge({ x1, y1, x2, y2, className = "stroke-fun-purple", width = 3, reducedMotion }: { x1: number; y1: number; x2: number; y2: number; className?: string; width?: number; reducedMotion: boolean }) {
  return (
    <motion.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className={className}
      strokeWidth={width}
      strokeLinecap="round"
      initial={reducedMotion ? { opacity: 0 } : { pathLength: 0, opacity: 0.4 }}
      animate={reducedMotion ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
      transition={{ duration: reducedMotion ? 0.2 : 0.35 }}
    />
  );
}

export interface Bar {
  key: string;
  label: string;
  value: number; // 0..1
  caption: string;
  fillClass: string;
}

/** Vertical bar chart (0..1) with optional dashed reference lines. */
export function Histogram({ bars, refs = [], width = 120, height = 150, label }: { bars: Bar[]; refs?: Array<{ value: number; label: string }>; width?: number; height?: number; label: string }) {
  const top = 14;
  const bottom = height - 30;
  const plot = bottom - top;
  const slot = width / bars.length;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="h-full w-full">
      <line x1={0} x2={width} y1={bottom} y2={bottom} className="stroke-gray-300" strokeWidth={1.5} />
      {bars.map((b, i) => {
        const h = Math.max(0, Math.min(1, b.value)) * plot;
        return (
          <g key={b.key} transform={`translate(${i * slot + slot * 0.2},0)`}>
            <rect x={0} y={bottom - h} width={slot * 0.6} height={h} rx={6} className={b.fillClass} style={{ transition: "y 300ms, height 300ms" }} />
            <text x={slot * 0.3} y={bottom - h - 3} textAnchor="middle" className="fill-gray-700 text-[10px] font-bold">
              {b.caption}
            </text>
            <text x={slot * 0.3} y={bottom + 14} textAnchor="middle" className="fill-gray-500 text-[10px]">
              {b.label}
            </text>
          </g>
        );
      })}
      {refs.map((r) => (
        <g key={r.label}>
          <line x1={0} x2={width} y1={bottom - r.value * plot} y2={bottom - r.value * plot} className="stroke-fun-pink" strokeWidth={1.5} strokeDasharray="4 3" />
          <text x={width - 2} y={bottom - r.value * plot - 2} textAnchor="end" className="fill-fun-pink text-[9px] font-bold">
            {r.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
