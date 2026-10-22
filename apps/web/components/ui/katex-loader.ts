import type katexModule from "katex";
import { SSR_KATEX } from "./katex.ssr";

export type Katex = typeof katexModule;

let katex: Katex | null = SSR_KATEX;
let failed = false;
let suspender: Promise<void> | null = null;

/**
 * For use inside a Suspense boundary. Returns KaTeX, suspends while its chunk loads
 * (the first math on a page starts the download), or returns null if the chunk could
 * not be loaded, in which case callers show the raw formula.
 */
export function readKatex(): Katex | null {
  if (katex) return katex;
  if (failed) return null;
  suspender ??= import("katex").then(
    (mod) => {
      katex = mod.default;
    },
    () => {
      failed = true;
    },
  );
  throw suspender;
}
