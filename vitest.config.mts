import { defineConfig } from "vitest/config";

// Root runner: `npm test` executes every package project in one process.
// Each package also runs on its own via `npm test -w <pkg>` / `turbo test`.
export default defineConfig({
  test: {
    projects: ["packages/math-engine", "packages/animation-engine", "packages/db"],
  },
});
