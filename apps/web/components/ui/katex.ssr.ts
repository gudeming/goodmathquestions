import katex from "katex";

/**
 * Server render: KaTeX is available synchronously, so server-rendered math is the
 * same HTML as before. The client build replaces this module with
 * `katex.ssr.client.ts` (NormalModuleReplacementPlugin in next.config.js) and
 * `katex-loader.ts` fetches KaTeX (~75 kB gz) as an async chunk on first use.
 */
export const SSR_KATEX: typeof katex | null = katex;
