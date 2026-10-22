import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "math-engine",
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
