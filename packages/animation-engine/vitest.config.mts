import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "animation-engine",
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
