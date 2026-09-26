import { expect, type Page, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, fillBodyMarkdown, JUNE, THEO } from "./helpers";

// Issue #72: the post page carries Edit, Unpublish and Delete for its own author, and
// nobody else sees them. Delete asks first, from the post page and from the editor.
// Every post a test creates, it deletes at the end, so the seed is the same next run.

// Theo is trusted, so Publish goes straight up and lands on the post page.
async function publishAsTheo(page: Page, title: string): Promise<string> {
  await devSignIn(page, THEO);
  await page.goto("/write");
  await page.getByLabel("Title").fill(title);
  await fillBodyMarkdown(page, "Written to be taken down again.");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(/\/@theo\/[a-z0-9-]+$/);
  return new URL(page.url()).pathname;
}

test("only the author sees Edit and the menu, and Edit opens the editor", async ({
  page,
  browser,
}) => {
  const title = `Author controls ${Date.now().toString(36)}`;
  const path = await publishAsTheo(page, title);

  await expect(page.getByTestId("post-edit")).toBeVisible();
  await expect(page.getByTestId("post-author-menu")).toBeVisible();

  const reader = await browser.newPage();
  await reader.goto(path);
  await expect(reader.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(reader.getByTestId("post-edit")).toHaveCount(0);
  await expect(reader.getByTestId("post-author-menu")).toHaveCount(0);
  await devSignIn(reader, JUNE);
  await reader.goto(path);
  await expect(reader.getByTestId("post-edit")).toHaveCount(0);
  await expect(reader.getByTestId("post-author-menu")).toHaveCount(0);
  await reader.close();

  await page.getByTestId("post-edit").click();
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]+$/);
  await expect(page.getByLabel("Title")).toHaveValue(title);
  await deleteCurrentPost(page);
});

test("Unpublish from the post page comes back to it as a draft", async ({ page }) => {
  const title = `Unpublish here ${Date.now().toString(36)}`;
  const path = await publishAsTheo(page, title);
  await expect(page.getByTestId("post-status-note")).toHaveCount(0);

  await page.getByLabel("More actions for this post").click();
  await page.getByRole("button", { name: "Unpublish" }).click();
  await expect(page).toHaveURL(new RegExp(`${path}\\?saved=unpublished$`));
  await expect(page.getByTestId("post-toast")).toHaveText(
    "Taken down. It is a draft again.",
  );
  await expect(page.getByTestId("post-status-note")).toHaveText(
    "Draft. Only you can see this page.",
  );
  // A draft has nothing to unpublish.
  await page.getByLabel("More actions for this post").click();
  await expect(page.getByRole("button", { name: "Unpublish" })).toHaveCount(0);

  await page.getByTestId("post-edit").click();
  await deleteCurrentPost(page);
});

test("Delete from the post page asks first, and Cancel keeps the post", async ({
  page,
}) => {
  const title = `Delete here ${Date.now().toString(36)}`;
  const path = await publishAsTheo(page, title);

  await page.getByLabel("More actions for this post").click();
  await page.getByRole("link", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Delete this post?" })).toBeVisible();
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);

  await page.getByLabel("More actions for this post").click();
  await page.getByRole("link", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete this post" }).click();
  await expect(page).toHaveURL(/\/write\?deleted=1$/);
  await expect(page.getByTestId("form-status")).toHaveText("Deleted.");
  const gone = await page.goto(path);
  expect(gone?.status()).toBe(404);
});

test("Delete in the editor asks first too, and Cancel returns to the editor", async ({
  page,
}) => {
  const title = `Delete in editor ${Date.now().toString(36)}`;
  await publishAsTheo(page, title);
  await page.getByTestId("post-edit").click();
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]+$/);
  const editor = page.url();

  await page.getByRole("link", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Delete this post?" })).toBeVisible();
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page).toHaveURL(editor);
  await expect(page.getByLabel("Title")).toHaveValue(title);

  await deleteCurrentPost(page);
});
