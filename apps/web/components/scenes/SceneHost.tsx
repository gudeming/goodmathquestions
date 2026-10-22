"use client";

import { useReducedMotion } from "framer-motion";
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import { parseSceneConfig, type SceneConfig, type SceneEvent, type ScenePhase, type SceneProps } from "@gmq/animation-engine";
import { SCENE_REGISTRY } from "./registry";

export interface SceneHostProps {
  /** Untrusted config (DB JSON / admin editor). Parsed here; invalid -> renders nothing. */
  config: unknown;
  phase: ScenePhase;
  locale: "en" | "zh";
  onEvent?: (e: SceneEvent) => void;
  onProposeAnswer?: (value: string) => void;
}

/**
 * Parses the config, looks the scene up in the registry and renders it inside
 * Suspense + an error boundary. A broken scene never breaks the question: it
 * renders null and reports `scene_config_invalid` / `scene_error`.
 */
export function SceneHost({ config, phase, locale, onEvent, onProposeAnswer }: SceneHostProps) {
  const parsed = useMemo(() => parseSceneConfig(config), [config]);
  const reducedMotion = useReducedMotion() ?? false;
  const onEventRef = useRef(onEvent);
  const reportedError = useRef<string | null>(null);

  useEffect(() => {
    onEventRef.current = onEvent;
  });

  const emit = useCallback((e: SceneEvent) => onEventRef.current?.(e), []);

  useEffect(() => {
    if (parsed.ok) {
      reportedError.current = null;
    } else if (reportedError.current !== parsed.error) {
      reportedError.current = parsed.error;
      emit({ name: "scene_config_invalid", props: { error: parsed.error } });
    }
  }, [parsed, emit]);

  // Remount the scene when the config content changes so stale scene state never meets a new config.
  const configKey = useMemo(() => (parsed.ok ? JSON.stringify(parsed.config) : ""), [parsed]);

  if (!parsed.ok) return null;
  const Scene = SCENE_REGISTRY[parsed.config.type] as unknown as ComponentType<SceneProps<SceneConfig>>;

  return (
    <SceneErrorBoundary resetKey={configKey} onError={(error) => emit({ name: "scene_error", props: { type: parsed.config.type, message: error.message } })}>
      <Suspense fallback={<SceneSkeleton />}>
        <Scene key={configKey} config={parsed.config} phase={phase} locale={locale} reducedMotion={reducedMotion} onEvent={emit} onProposeAnswer={onProposeAnswer} />
      </Suspense>
    </SceneErrorBoundary>
  );
}

/** Lightweight placeholder with the scene's footprint, so layout doesn't jump. */
export function SceneSkeleton() {
  return <div aria-hidden className="h-[280px] w-full animate-pulse rounded-2xl bg-primary-50 sm:h-[360px]" />;
}

interface BoundaryProps {
  resetKey: string;
  onError: (error: Error) => void;
  children: ReactNode;
}

class SceneErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError(error);
    if (process.env.NODE_ENV !== "production") console.error("[SceneHost] scene crashed", error, info.componentStack);
  }

  componentDidUpdate(prev: BoundaryProps) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
