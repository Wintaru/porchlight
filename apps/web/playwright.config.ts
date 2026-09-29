import { defineConfig, devices } from "@playwright/test";

import {
  BASE_URL,
  PORT,
  TURNSTILE_BASE_URL,
  TURNSTILE_FORCED_CHALLENGE_SITE_KEY,
  TURNSTILE_PORT,
} from "./e2e/servers";

const IS_CI = Boolean(process.env.CI);

// The whole suite runs against one seeded database (supabase/seed.sql) and every test
// puts back what it changed (#99), so two tests that overlap in time still
// see each other's half-done state: an admin save writes the whole settings form, a published post
// changes an author's count. One worker at a time is the only order in which the
// cleanup discipline holds, and it costs about a minute. Zero retries, in CI and
// locally (#19): a test that needs a second try is a bug, not a flake.
// fullyParallel lets `--shard` split a file by test instead of keeping it whole.
// Without it, design.spec.ts (about half the suite) fills its shard and leaves another
// empty. CI runs each shard on its own database. Order is unchanged on one worker, but
// a file-scope beforeAll/afterAll now runs once per test: a file that needs a
// once-per-file hook must use test.describe.configure({ mode: "serial" }).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: 1,
  retries: 0,
  // A CI runner compiles each route cold on its first hit, and with no retries one slow
  // first compile must not fail the run. That holds for one assertion too: a form
  // action and the page it redirects to can both compile inside one toHaveURL.
  timeout: IS_CI ? 60_000 : 30_000,
  expect: { timeout: IS_CI ? 15_000 : 5_000 },
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
  webServer: [
    {
      command: `pnpm dev --port ${String(PORT)}`,
      url: BASE_URL,
      // The app builds its own absolute links (the MCP resource, invite links) from
      // NEXT_PUBLIC_SITE_URL. On any port but 3000 the .env.local value would name
      // another server, so the suite's own server is told its address (#99).
      env: { NEXT_PUBLIC_SITE_URL: BASE_URL },
      reuseExistingServer: !IS_CI,
      // A cold Next.js dev server on a CI runner takes longer than the 60 s default.
      timeout: 180_000,
    },
    // The Turnstile box's own server (e2e/servers.ts, #103). Next allows one dev server
    // per build folder, so this one builds into .next/turnstile (next.config.ts).
    {
      command: `pnpm dev --port ${String(TURNSTILE_PORT)}`,
      url: TURNSTILE_BASE_URL,
      env: {
        NEXT_PUBLIC_SITE_URL: TURNSTILE_BASE_URL,
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: TURNSTILE_FORCED_CHALLENGE_SITE_KEY,
        PORCHLIGHT_DIST_DIR: ".next/turnstile",
      },
      reuseExistingServer: !IS_CI,
      timeout: 180_000,
    },
  ],
});
