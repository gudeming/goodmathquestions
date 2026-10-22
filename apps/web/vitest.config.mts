import { fileURLToPath } from "node:url";
import { defineProject } from "vitest/config";

// Server-render smoke tests for the scene components (no DOM library needed).
// Run: npx vitest run --root apps/web   (not part of the root `npm test` projects list yet)
export default defineProject({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    name: "web-scenes",
    include: ["components/scenes/**/*.test.tsx", "components/tools/**/*.test.ts"],
    environment: "node",
  },
});
