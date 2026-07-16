import { defineConfig, devices } from "@playwright/test";

const apiPort = process.env.PLAYWRIGHT_API_PORT ?? "4000";
const webPort = process.env.PLAYWRIGHT_WEB_PORT ?? "3000";
const usesIsolatedPorts =
  process.env.PLAYWRIGHT_API_PORT !== undefined ||
  process.env.PLAYWRIGHT_WEB_PORT !== undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `API_PORT=${apiPort} WEB_ORIGIN=http://127.0.0.1:${webPort} pnpm --filter @cardboard/api dev`,
      url: `http://127.0.0.1:${apiPort}/health`,
      reuseExistingServer: !process.env.CI && !usesIsolatedPorts,
      timeout: 120_000,
    },
    {
      command: `NEXT_PUBLIC_API_URL=http://127.0.0.1:${apiPort} pnpm --filter @cardboard/web dev --port ${webPort}`,
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: !process.env.CI && !usesIsolatedPorts,
      timeout: 120_000,
    },
  ],
});
