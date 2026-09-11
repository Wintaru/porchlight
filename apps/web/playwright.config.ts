import { defineConfig, devices } from "@playwright/test";

// PORT lets parallel checkouts on one machine run their own server.
const PORT = Number(process.env.PORT ?? 3000);
// localhost, not 127.0.0.1: Next.js dev blocks cross-origin requests to its HMR endpoint.
const BASE_URL = `http://localhost:${String(PORT)}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm dev --port ${String(PORT)}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
