"use client";

import { useReducedMotion } from "framer-motion";
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import type { ParseSceneResult, SceneConfig, SceneEvent, ScenePhase, SceneProps } from "@gmq/animation-engine";
import { SCENE_REGISTRY } from "./registry";
import { parseScene, peekSceneParser, readSceneParser } from "./scene-parser";

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
 *
 * The schemas are an async chunk in the browser (see `scene-parser.ts`). Where they
 * are already loaded (server render, tests, any later render) an invalid config
 * renders nothing at all, exactly as before; otherwise the parse happens inside the
 * Suspense boundary, so the skeleton covers the schema chunk and the scene chunk
 * together and a server-rendered scene stays in place while both load.
 */
export function SceneHost({ config, phase, locale, onEvent, onProposeAnswer }: SceneHostProps) {
  const ready = peekSceneParser();
  const early = useMemo(() => (ready ? parseScene(ready, config) : null), [ready, config]);
  const reducedMotion = useReducedMotion() ?? false;
  const onEventRef = useRef(onEvent);
  const reportedError = useRef<string | null>(null);

  useEffect(() => {
    onEventRef.current = onEvent;
  });

  const emit = useCallback((e: SceneEvent) => onEventRef.current?.(e), []);

  const report = useCallback(
    (parsed: ParseSceneResult) => {
      if (parsed.ok) {
        reportedError.current = null;
      } else if (reportedError.current !== parsed.error) {
        reportedError.current = parsed.error;
        emit({ name: "scene_config_invalid", props: { error: parsed.error } });
      }
    },
    [emit],
  );

  useEffect(() => {
    if (early) report(early);
  }, [early, report]);

  // Reset a crashed scene when the config content changes.
  const resetKey = useMemo(() => stableKey(config), [config]);

  if (early && !early.ok) return null;

  return (
    <SceneErrorBoundary resetKey={resetKey} onError={(error) => emit({ name: "scene_error", props: { type: sceneType(config), message: error.message } })}>
      <Suspense fallback={<SceneSkeleton />}>
        <ParsedScene config={config} report={report} phase={phase} locale={locale} reducedMotion={reducedMotion} onEvent={emit} onProposeAnswer={onProposeAnswer} />
      </Suspense>
    </SceneErrorBoundary>
  );
}

interface ParsedSceneProps extends Omit<SceneProps<SceneConfig>, "config"> {
  config: unknown;
  report: (parsed: ParseSceneResult) => void;
}

/** Suspends until the schemas are loaded, then renders the registered scene (or null if invalid). */
function ParsedScene({ config, report, ...sceneProps }: ParsedSceneProps) {
  const parsed = parseScene(readSceneParser(), config);

  useEffect(() => {
    report(parsed);
  }, [parsed, report]);

  // Remount the scene when the config content changes so stale scene state never meets a new config.
  const configKey = useMemo(() => (parsed.ok ? JSON.stringify(parsed.config) : ""), [parsed]);

  if (!parsed.ok) return null;
  const Scene = SCENE_REGISTRY[parsed.config.type] as unknown as ComponentType<SceneProps<SceneConfig>>;
  return <Scene key={configKey} config={parsed.config} {...sceneProps} />;
}

function stableKey(config: unknown): string {
  try {
    return JSON.stringify(config) ?? "";
  } catch {
    return "";
  }
}

function sceneType(config: unknown): string {
  const type = typeof config === "object" && config !== null ? (config as { type?: unknown }).type : undefined;
  return typeof type === "string" ? type : "";
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
