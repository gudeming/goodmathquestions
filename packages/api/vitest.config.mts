import { defineProject } from "vitest/config";

// Integration tests talk to the local Postgres + Redis from docker compose. When
// either is unreachable the suites skip themselves (see src/test/helpers.ts), so
// `npm test` still passes without Docker. Files run one at a time (single fork)
// because they share one database: e.g. one suite's fixture cleanup would otherwise
// change the daily-puzzle candidate set under another. (`fileParallelism` is a
// root-only option, so it cannot be set per project.)
export default defineProject({
  test: {
    name: "api",
    include: ["src/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
