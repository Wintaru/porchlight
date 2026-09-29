import { expect, test } from "@playwright/test";

import { devSignIn, JUNE, LAMPLIGHTER } from "./helpers";

// Issue #12's acceptance test: switching region changes the checklist and the
// retention value #10 reads, and picking "Just me" hides the editor for a plain
// member and sets the three D20 keys. Runs against the seeded local stack
// (docs/setup/supabase.md).

test("a plain member may not reach the site settings page", async ({ page }) => {
  await devSignIn(page, JUNE);

  const response = await page.goto("/admin");

  expect(response?.status()).toBe(404);
});

test("an admin sees the duty checklist and can change site identity", async ({
  page,
}) => {
  await devSignIn(page, LAMPLIGHTER);
  await page.goto("/admin");
  await expect(page.getByTestId("duty-hash-match")).toBeVisible();
  await expect(page.getByTestId("duty-turnstile")).toBeVisible();

  const taglineField = page.getByLabel("Tagline");
  const original = await taglineField.inputValue();
  const stamp = Date.now().toString(36);
  await taglineField.fill(`A porch, tested ${stamp}`);
  await page.getByRole("button", { name: "Save settings" }).click();

  await expect(page).toHaveURL(/\/admin\?done=saved$/);
  await expect(page.getByTestId("form-status")).toHaveText("Saved.");
  await page.reload();
  await expect(page.getByLabel("Tagline")).toHaveValue(`A porch, tested ${stamp}`);

  // Cleanup: restore the tagline so the seed reads the same for the next run.
  await page.getByLabel("Tagline").fill(original);
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page).toHaveURL(/\/admin\?done=saved$/);
});

// #108: a refused save says what was wrong in words and keeps the other edits.
test("a refused settings save explains itself and keeps the page as typed", async ({
  page,
}) => {
  await devSignIn(page, LAMPLIGHTER);
  await page.goto("/admin");
  const stamp = Date.now().toString(36);
  const tagline = `Kept on refusal ${stamp}`;
  await page.getByLabel("Tagline").fill(tagline);
  const flagAt = page.getByLabel("Flag at");
  const raised = Math.min(1, Number(await flagAt.inputValue()) + 0.05).toFixed(2);
  await flagAt.fill(raised);
  await page.getByRole("button", { name: "Save settings" }).click();

  await expect(page.getByTestId("form-error")).toHaveText(
    /^Check the moderation thresholds: thresholds may only be lowered/,
  );
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByLabel("Tagline")).toHaveValue(tagline);
  await expect(flagAt).toHaveValue(raised);

  // Nothing was stored.
  await page.reload();
  await expect(page.getByLabel("Tagline")).not.toHaveValue(tagline);
});

test("switching region changes the reporting info and the raw IP retention window", async ({
  page,
}) => {
  await devSignIn(page, LAMPLIGHTER);
  await page.goto("/admin");

  await page.getByLabel("Hosting region").selectOption("US");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page).toHaveURL(/\/admin\?done=saved$/);

  await page.reload();
  await expect(page.getByTestId("region-reporting-target")).toContainText(
    "NCMEC CyberTipline",
  );
  await expect(page.getByTestId("region-ip-window")).toBeVisible();
  await expect(page.getByTestId("region-warning")).toHaveCount(0);

  // Back to the seeded default, which is also the cleanup for the next run. The page is
  // server-rendered, so the "check local law" warning shows once the save lands.
  await page.getByLabel("Hosting region").selectOption("other");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page).toHaveURL(/\/admin\?done=saved$/);
  await expect(page.getByTestId("region-warning")).toBeVisible();
});

test("the Just me preset hides the editor for a plain member, and sets the three keys", async ({
  page,
  browser,
}) => {
  await devSignIn(page, LAMPLIGHTER);
  await page.goto("/admin");

  try {
    await page.getByTestId("preset-just_me").click();
    await expect(page).toHaveURL(/\/admin\?done=saved$/);
    await expect(page.getByLabel("Posting")).toHaveValue("staff");
    await expect(page.getByLabel("Sign-up")).toHaveValue("closed");

    const member = await browser.newPage();
    await devSignIn(member, JUNE);
    await member.goto("/write");
    await expect(member.getByTestId("cannot-post")).toBeVisible();
    await expect(member.getByRole("heading", { name: "New post" })).toHaveCount(0);
    await member.close();
  } finally {
    // Cleanup: restore open access so the rest of the e2e suite can write posts.
    await page.getByTestId("preset-open_porch").click();
    await expect(page).toHaveURL(/\/admin\?done=saved$/);
  }
});
