import type katex from "katex";

/** Browser build of `katex.ssr.ts`: no synchronous KaTeX; `katex-loader.ts` loads it on demand. */
export const SSR_KATEX: typeof katex | null = null;
