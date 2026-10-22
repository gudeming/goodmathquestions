import { defineProject } from "vitest/config";

// Pure functions only: nothing here may open a Prisma connection.
export default defineProject({
  test: {
    name: "db",
    include: ["prisma/**/*.test.ts", "src/**/*.test.ts"],
    environment: "node",
  },
});
