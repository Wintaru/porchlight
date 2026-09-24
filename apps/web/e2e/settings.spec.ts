import { expect, test } from "@playwright/test";

import { devSignIn, THEO } from "./helpers";

// Issue #48: the Settings board. The side menu reaches each card, the Anonymous posts
// card claims what this browser's cookie holds (or a pasted code), and Erase opens its
// own confirmation page. The claimed post is deleted at the end, so the seed is the
// same for the next run.

test("the Anonymous posts card claims what this browser posted", async ({ page }) => {
  const title = `Claimed from settings ${Date.now().toString(36)}`;
  await page.goto("/p/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Body (markdown)").fill("Written before the account.");
  await page.getByRole("button", { name: "Post anonymously" }).click();
  await expect(page).toHaveURL(/\/anon$/);

  await devSignIn(page, THEO);
  await page.goto("/settings");
  await expect(page.getByTestId("claim-found")).toHaveText(
    "1 post found in this browser",
  );
  await page.getByTestId("claim-found-button").click();
  await expect(page).toHaveURL(/\/anon\?claim=claimed$/);
  await expect(page.getByTestId("claim-status")).toHaveText(
    "Claimed. These are yours now.",
  );

  // Nothing is left to claim, so the box is gone; the paste-a-code form stays.
  await page.goto("/settings");
  await expect(page.getByTestId("claim-found")).toHaveCount(0);
  await expect(page.getByLabel("Claim code")).toBeVisible();

  await page.goto("/write");
  await page.getByTestId("my-posts").getByRole("link", { name: title }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/write\?deleted=1$/);
});

test("a claim code that matches nothing says so", async ({ page }) => {
  await devSignIn(page, THEO);
  await page.goto("/settings");
  await expect(page.getByTestId("claim-found")).toHaveCount(0);
  await page.getByLabel("Claim code").fill("NOPE-NOPE-NOPE");
  await page.getByTestId("claim-code-button").click();
  await expect(page).toHaveURL(/\/anon\?claim=not-found$/);
  await expect(page.getByTestId("claim-status")).toContainText("did not match anything");
});

test("the side menu reaches every card, and Erase opens its confirmation", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  await page.goto("/settings");
  const menu = page.getByRole("navigation", { name: "Settings sections" });
  for (const [label, id] of [
    ["Profile", "profile"],
    ["Agents", "agents"],
    ["Anonymous posts", "anonymous"],
    ["Your data", "data"],
    ["Erase everything", "erase"],
  ] as const) {
    await menu.getByRole("link", { name: label }).click();
    // The link points at its card; the browser does the scrolling.
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }

  await expect(
    page.locator("#data").getByRole("link", { name: "Export as markdown + JSON" }),
  ).toHaveAttribute("href", "/settings/export");
  await page
    .locator("#erase")
    .getByRole("link", { name: "Erase everything I contributed" })
    .click();
  await expect(page).toHaveURL(/\/settings\/erase$/);
  // Without the box ticked, nothing is erased.
  await page.getByTestId("erase-confirm-submit").click();
  await expect(page.getByTestId("erase-error")).toHaveText(
    "Check the box to confirm before erasing.",
  );
  await page.getByRole("link", { name: /Back to settings/ }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test("a claim code of only spaces is refused before it is sent", async ({ page }) => {
  await devSignIn(page, THEO);
  await page.goto("/settings");
  await page.getByLabel("Claim code").fill("   ");
  await page.getByTestId("claim-code-button").click();
  await expect(page).toHaveURL(/\/settings$/);
  expect(
    await page
      .getByLabel("Claim code")
      .evaluate((el) => (el as HTMLInputElement).validity.patternMismatch),
  ).toBe(true);
});
