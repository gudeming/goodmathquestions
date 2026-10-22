"use client";

import { useEffect, useRef, useState } from "react";

/** Reduced motion: no travel, just a <= 200 ms fade to the final frame. */
export const REDUCED_MOTION_MS = 200;

/**
 * Drives a reveal timeline with requestAnimationFrame. Returns progress in [0, 1].
 * Calls `onDone` once per activation when the timeline finishes. With reduced motion the
 * progress jumps to 1 (callers fade the final frame in) and `onDone` fires after 200 ms.
 */
export function useRevealProgress(active: boolean, durationMs: number, reducedMotion: boolean, onDone: () => void): number {
  const [progress, setProgress] = useState(0);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }
    if (reducedMotion) {
      setProgress(1);
      const t = setTimeout(() => onDoneRef.current(), REDUCED_MOTION_MS);
      return () => clearTimeout(t);
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else onDoneRef.current();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, durationMs, reducedMotion]);

  return progress;
}

/** Local progress of a sub-interval [start, end] of a 0..1 timeline, clamped to [0, 1]. */
export function segment(progress: number, start: number, end: number): number {
  if (end <= start) return progress >= end ? 1 : 0;
  return Math.max(0, Math.min(1, (progress - start) / (end - start)));
}

/** Smooth ease for travel animations. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
