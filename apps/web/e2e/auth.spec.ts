import { expect, type Page, test } from "@playwright/test";

import { signOut } from "./helpers";

// The issue #4 acceptance test: a member signs in through the dev path headless, the
// session survives navigation, the settings form round-trips through AccountManager,
// and sign-out ends it. Runs against the seeded local stack (docs/setup/supabase.md).
const JUNE = { email: "june@porchlight.local", password: "porchlight", handle: "june" };
const SEED_PASSWORD = "porchlight";

async function devSignIn(
  page: Page,
  email: string,
  password = SEED_PASSWORD,
): Promise<void> {
  await page.goto("/auth/dev-sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in as this member" }).click();
  await expect(page.getByTestId("session-handle")).toHaveText(`@${JUNE.handle}`);
}

test("a visitor sees the Sign in link and is sent to sign in from /settings", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Sign in" }),
  ).toBeVisible();

  await page.goto("/settings");
  await expect(page).toHaveURL(/\/auth\/dev-sign-in\?next=%2Fsettings$/);
});

test("the dev sign-in mints a session and lands on the page asked for", async ({
  page,
}) => {
  await page.goto("/auth/dev-sign-in?next=%2Fsettings");
  await page.getByLabel("Email").fill(JUNE.email);
  await page.getByLabel("Password").fill(JUNE.password);
  await page.getByRole("button", { name: "Sign in as this member" }).click();

  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByTestId("session-handle")).toHaveText(`@${JUNE.handle}`);
  await expect(page.getByLabel("Handle")).toHaveValue(JUNE.handle);
  await expect(
    page.getByText("On probation: posts and comments wait for approval."),
  ).toBeVisible();

  await page.goto("/");
  await expect(page.getByTestId("session-handle")).toHaveText(`@${JUNE.handle}`);
});

test("a wrong password is refused with a message", async ({ page }) => {
  await page.goto("/auth/dev-sign-in");
  await page.getByLabel("Email").fill(JUNE.email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in as this member" }).click();

  await expect(page.getByTestId("form-error")).toHaveText(/refused/);
  await expect(page.getByTestId("session-handle")).toHaveCount(0);
});

test("the settings form saves and the handle rules answer", async ({ page }) => {
  await devSignIn(page, JUNE.email);
  await page.goto("/settings");
  const original = {
    displayName: await page.getByLabel("Display name").inputValue(),
    bio: await page.getByLabel("Bio").inputValue(),
  };
  const bio = `Edited by Playwright at ${new Date().toISOString()}`;

  await page.getByLabel("Display name").fill("June P.");
  await page.getByLabel("Bio").fill(bio);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("form-status")).toHaveText("Saved.");
  await expect(page.getByLabel("Display name")).toHaveValue("June P.");
  await expect(page.getByLabel("Bio")).toHaveValue(bio);

  for (const [handle, message] of [
    ["June", /2 to 30 characters/],
    ["mod", /reserved/],
    ["theo", /already someone's/],
  ] as const) {
    await page.getByLabel("Handle").fill(handle);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByTestId("form-error")).toHaveText(message);
  }
  await expect(page.getByLabel("Handle")).toHaveValue(JUNE.handle);

  // Put the seed row back so the next run starts from the same place.
  await page.getByLabel("Display name").fill(original.displayName);
  await page.getByLabel("Bio").fill(original.bio);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("form-status")).toHaveText("Saved.");
});

test("sign-out ends the session", async ({ page }) => {
  await devSignIn(page, JUNE.email);
  await expect(page.getByTestId("session-handle")).toHaveText(`@${JUNE.handle}`);

  await signOut(page);

  await expect(
    page.getByRole("banner").getByRole("link", { name: "Sign in" }),
  ).toBeVisible();
  await expect(page.getByTestId("session-handle")).toHaveCount(0);
});

test("the Google button starts the OAuth flow through Supabase Auth", async ({
  page,
}) => {
  // No Google keys locally, so Google itself is stubbed. The point is the hop before
  // it: Supabase Auth's authorize endpoint, reached from the Server Function.
  await page.route(/accounts\.google\.com/, (route) =>
    route.fulfill({ body: "google stub" }),
  );
  const authorize = page.waitForRequest(/\/auth\/v1\/authorize\?.*provider=google/);

  await page.goto("/auth/sign-in?next=%2Fsettings");
  await page.getByRole("button", { name: "Sign in with Google" }).click();

  const request = await authorize;
  const redirectTo = new URL(request.url()).searchParams.get("redirect_to");
  expect(redirectTo).toMatch(/\/auth\/callback\?next=%2Fsettings$/);
});
