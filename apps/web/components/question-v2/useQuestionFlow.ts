"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Three-act state machine:
 *
 *   hook ──(guess saved → continue | skip)──▶ explore ──(correct | give up)──▶ reveal
 *
 * Guessing does not leave the hook: the histogram is shown first, then "continue".
 * `gaveUp` records how the reveal was reached. Phase, guess, attempts and hints are
 * persisted per question in localStorage, so a refresh lands on the same act.
 */
export type FlowPhase = "hook" | "explore" | "reveal";

export interface FlowState {
  phase: FlowPhase;
  /** Saved guess value (slider number as text, option id, or left/right/same). */
  guess: string | null;
  skippedGuess: boolean;
  attempts: number;
  hintsRevealed: number;
  solved: boolean;
  gaveUp: boolean;
}

export const GIVE_UP_AFTER = 3;
const STORAGE_VERSION = 1;
export const flowStorageKey = (questionId: string) => `gmq:qflow:${questionId}`;

const PHASES: readonly FlowPhase[] = ["hook", "explore", "reveal"];

export function initialFlowState(startPhase: FlowPhase): FlowState {
  return { phase: startPhase, guess: null, skippedGuess: false, attempts: 0, hintsRevealed: 0, solved: false, gaveUp: false };
}

const nonNegInt = (v: unknown, max: number): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : null;

/** Parses a stored flow; anything malformed yields null (start fresh). Exported for tests. */
export function parseStoredFlow(raw: string | null, startPhase: FlowPhase): FlowState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (v?.v !== STORAGE_VERSION || !PHASES.includes(v.phase as FlowPhase)) return null;
    const attempts = nonNegInt(v.attempts, 10_000);
    const hints = nonNegInt(v.hintsRevealed, 100);
    if (attempts === null || hints === null) return null;
    const phase = v.phase as FlowPhase;
    return {
      // A question that lost its hook since the last visit cannot go back to it.
      phase: phase === "hook" && startPhase !== "hook" ? startPhase : phase,
      guess: typeof v.guess === "string" && v.guess.length <= 64 ? v.guess : null,
      skippedGuess: v.skippedGuess === true,
      attempts,
      hintsRevealed: hints,
      solved: v.solved === true,
      gaveUp: v.gaveUp === true,
    };
  } catch {
    return null;
  }
}

function readStored(questionId: string, startPhase: FlowPhase): FlowState | null {
  try {
    return parseStoredFlow(window.localStorage.getItem(flowStorageKey(questionId)), startPhase);
  } catch {
    return null; // storage blocked
  }
}

function writeStored(questionId: string, state: FlowState): void {
  try {
    window.localStorage.setItem(flowStorageKey(questionId), JSON.stringify({ v: STORAGE_VERSION, ...state }));
  } catch {
    // Private mode / quota: the flow still works for this page view.
  }
}

export interface QuestionFlow {
  state: FlowState;
  /** True when this state came from localStorage (no celebration on restore). */
  restored: boolean;
  saveGuess: (value: string) => void;
  skipGuess: () => void;
  startExplore: () => void;
  recordAttempt: (correct: boolean) => void;
  revealHint: (total: number) => void;
  giveUp: () => void;
}

/**
 * Must be used in a component that only renders on the client (the question view
 * renders after its data loads, so the lazy localStorage read cannot mismatch SSR).
 */
export function useQuestionFlow(questionId: string, startPhase: FlowPhase): QuestionFlow {
  const restoredRef = useRef(false);
  const [state, setState] = useState<FlowState>(() => {
    const stored = typeof window === "undefined" ? null : readStored(questionId, startPhase);
    restoredRef.current = stored !== null;
    return stored ?? initialFlowState(startPhase);
  });

  useEffect(() => {
    writeStored(questionId, state);
  }, [questionId, state]);

  const saveGuess = useCallback((value: string) => {
    setState((s) => (s.phase === "hook" ? { ...s, guess: value, skippedGuess: false } : s));
  }, []);

  const skipGuess = useCallback(() => {
    setState((s) => (s.phase === "hook" ? { ...s, skippedGuess: s.guess === null, phase: "explore" } : s));
  }, []);

  const startExplore = useCallback(() => {
    setState((s) => (s.phase === "hook" ? { ...s, phase: "explore" } : s));
  }, []);

  const recordAttempt = useCallback((correct: boolean) => {
    setState((s) => {
      if (s.phase !== "explore") return s;
      const attempts = s.attempts + 1;
      return correct ? { ...s, attempts, solved: true, phase: "reveal" } : { ...s, attempts };
    });
  }, []);

  const revealHint = useCallback((total: number) => {
    setState((s) => (s.hintsRevealed < total ? { ...s, hintsRevealed: s.hintsRevealed + 1 } : s));
  }, []);

  const giveUp = useCallback(() => {
    setState((s) => (s.phase === "explore" && s.attempts >= GIVE_UP_AFTER ? { ...s, gaveUp: true, phase: "reveal" } : s));
  }, []);

  return { state, restored: restoredRef.current, saveGuess, skipGuess, startExplore, recordAttempt, revealHint, giveUp };
}
