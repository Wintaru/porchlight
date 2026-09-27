import { expect, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, fillBodyMarkdown, JUNE, THEO } from "./helpers";

// Issue #23: a published post keeps the version readers saw each time its words change,
// and its author reads the history as a diff. Another member gets the editor's 404.

test("editing a published post keeps the old words, shown as a diff", async ({
  page,
  browser,
}) => {
  const title = `History ${Date.now().toString(36)}`;
  await devSignIn(page, THEO);
  await page.goto("/write");
  await page.getByLabel("Title").fill(title);
  await fillBodyMarkdown(page, "The first line.\nThe second line.");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(/\/@theo\/history-/);

  await page.getByTestId("post-edit").click();
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]+$/);
  const editor = page.url();
  await expect(page.getByRole("link", { name: "History" })).toBeVisible();
  await page.goto(`${editor}/history`);
  await expect(page.getByTestId("history-empty")).toBeVisible();

  await page.goto(editor);
  await fillBodyMarkdown(page, "The first line.\nThe second line, better.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\?saved=/);

  await page.getByRole("link", { name: "History" }).click();
  const entries = page.getByTestId("history-entry");
  await expect(entries).toHaveCount(1);
  const diff = entries.first().getByTestId("history-diff");
  await expect(diff.locator('[data-kind="removed"]')).toHaveText("- The second line.");
  await expect(diff.locator('[data-kind="added"]')).toHaveText(
    "+ The second line, better.",
  );

  // June may not edit Theo's post, so its history is a 404 to her.
  const june = await browser.newPage();
  await devSignIn(june, JUNE);
  const other = await june.goto(`${editor}/history`);
  expect(other?.status()).toBe(404);
  await june.close();

  await page.goto(editor);
  await deleteCurrentPost(page);
});
