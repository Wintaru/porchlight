import { expect, test } from "@playwright/test";

import { signOut } from "./helpers";

// The one flow no fake can stand in for: Google's own consent screen. Runs in a visible
// browser with a person at the keyboard (`pnpm test:e2e:headed`), against a local stack
// that has the Google keys (docs/setup/google-oauth.md). Everything else about sign-in
// is covered headless in auth.spec.ts through the dev sign-in and a stubbed Google.

// Long enough to pick an account and pass a 2FA prompt.
const PERSON_TIMEOUT = 3 * 60 * 1000;

test.skip(
  Boolean(process.env.CI),
  "Needs a person at a visible browser and Google keys.",
);

test("a person signs in with Google and gets a session", async ({ page }) => {
  test.setTimeout(PERSON_TIMEOUT + 30_000);

  await page.goto("/");
  await page.getByRole("button", { name: "Sign in with Google" }).click();

  // The person does the Google part. The header button carries no `next`, so the
  // callback lands on `/`; the session showing is the thing to wait for.
  await expect(page.getByTestId("session-handle")).toHaveText(/^@/, {
    timeout: PERSON_TIMEOUT,
  });

  await signOut(page);
  await expect(page.getByTestId("session-handle")).toHaveCount(0);
});
