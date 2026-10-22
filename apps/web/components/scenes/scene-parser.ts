import { useEffect, useSyncExternalStore } from "react";
import type { ParseSceneResult } from "@gmq/animation-engine";
import { SSR_SCENE_PARSER } from "./scene-parser.ssr";

/** `parseSceneConfig` from the engine: untrusted JSON in, typed config or error out. Never throws. */
export type SceneParser = (input: unknown) => ParseSceneResult;

/*
 * The scene schemas (42 Zod schemas + their refinements + Zod itself, ~25 kB gz) are
 * not in the page bundle. On the server and in tests `scene-parser.ssr.ts` hands the
 * parser over synchronously; the client build swaps that module for
 * `scene-parser.ssr.client.ts` (next.config.js) and loads the schemas as an async
 * chunk instead. The chunk is requested as soon as this module runs in a browser, so
 * it is normally in before the question data arrives over tRPC.
 */
let parser: SceneParser | null = SSR_SCENE_PARSER;
let pending: Promise<SceneParser> | null = null;
let suspender: Promise<void> | null = null;
let failure: { error: unknown } | null = null;
const listeners = new Set<() => void>();
// Parsed results per config object (configs are immutable props). Several components
// ask about the same config (hasScene + SceneHost) and some refinements run solvers.
const results = new WeakMap<object, ParseSceneResult>();

/** Starts (once) loading the schema chunk. Resolves immediately where it is already loaded. */
export function loadSceneParser(): Promise<SceneParser> {
  if (parser) return Promise.resolve(parser);
  if (!pending) {
    pending = import("@gmq/animation-engine/src/schema").then(
      (mod) => {
        parser = mod.parseSceneConfig;
        failure = null;
        listeners.forEach((notify) => notify());
        return mod.parseSceneConfig;
      },
      (error: unknown) => {
        // Let a later render retry (flaky network); the current one surfaces the error.
        pending = null;
        failure = { error };
        throw error;
      },
    );
    suspender = pending.then(
      () => undefined,
      () => undefined,
    );
  }
  return pending;
}

/** The parser if it is already available, else null (does not start loading). */
export function peekSceneParser(): SceneParser | null {
  return parser;
}

/**
 * For use inside a Suspense boundary: returns the parser, suspends while it loads,
 * and throws the load error once (to the nearest error boundary) if the chunk failed.
 */
export function readSceneParser(): SceneParser {
  if (parser) return parser;
  if (failure) {
    const { error } = failure;
    failure = null;
    throw error;
  }
  loadSceneParser().catch(() => undefined);
  throw suspender;
}

/** Parse with memoisation per config object. Same result as `parseSceneConfig(input)`. */
export function parseScene(parse: SceneParser, input: unknown): ParseSceneResult {
  if (typeof input !== "object" || input === null) return parse(input);
  let result = results.get(input);
  if (!result) {
    result = parse(input);
    results.set(input, result);
  }
  return result;
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

/** The parser, or null until its chunk has loaded (the component re-renders then). */
export function useSceneParser(): SceneParser | null {
  const current = useSyncExternalStore(subscribe, peekSceneParser, peekSceneParser);
  useEffect(() => {
    if (!current) loadSceneParser().catch(() => undefined);
  }, [current]);
  return current;
}

if (typeof window !== "undefined") loadSceneParser().catch(() => undefined);
