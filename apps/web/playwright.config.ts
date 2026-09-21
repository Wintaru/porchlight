import { defineConfig, devices } from "@playwright/test";

// PORT lets parallel checkouts on one machine run their own server.
const PORT = Number(process.env.PORT ?? 3000);
// localhost, not 127.0.0.1: Next.js dev blocks cross-origin requests to its HMR endpoint.
const BASE_URL = `http://localhost:${String(PORT)}`;
const IS_CI = Boolean(process.env.CI);

// The whole suite runs against one seeded database (supabase/seed.sql) and every test
// but the erase test puts back what it changed, so two tests that overlap in time still
// see each other's half-done state: an admin save writes the whole settings form, a published post
// changes an author's count. One worker at a time is the only order in which the
// cleanup discipline holds, and it costs about a minute. Zero retries, in CI and
// locally (#19): a test that needs a second try is a bug, not a flake.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // A CI runner compiles each route cold on its first hit, and with no retries one slow
  // first compile must not fail the run.
  timeout: IS_CI ? 60_000 : 30_000,
  forbidOnly: IS_CI,
  reporter: IS_CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    // Kept only when a test fails: with no retries there is no "first retry" to
    // record on. CI uploads playwright-report/ and test-results/ as an artifact.
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /\.headed\.spec\.ts$/,
    },
    // The real Google sign-in, watched by a person: `pnpm test:e2e:headed`. Needs the
    // Google keys in the local stack (docs/setup/google-oauth.md). `pnpm test:e2e`
    // selects the chromium project only, and the spec skips itself under CI.
    // Branded Chrome, not the bundled Chromium: Google refuses to sign in on the
    // bundled build ("This browser or app may not be secure").
    {
      name: "headed",
      use: { ...devices["Desktop Chrome"], channel: "chrome", headless: false },
      testMatch: /\.headed\.spec\.ts$/,
    },
  ],
  webServer: {
    command: `pnpm dev --port ${String(PORT)}`,
    url: BASE_URL,
    reuseExistingServer: !IS_CI,
    // A cold Next.js dev server on a CI runner takes longer than the 60 s default.
    timeout: 180_000,
  },
});
