import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke tests run against an already-running deployment:
 *   E2E_BASE_URL=http://localhost:3000 npm run test:e2e -w @gmq/web
 * With E2E_BASE_URL unset every spec is skipped, so CI without a server stays green.
 */
const baseURL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
