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

test("Unpublish from the post page comes back to it as a draft, and Publish puts it back", async ({
  page,
}) => {
  const title = `Unpublish here ${Date.now().toString(36)}`;
  const path = await publishAsTheo(page, title);
  await expect(page.getByTestId("post-status-note")).toHaveCount(0);
  await expect(page.getByTestId("post-publish")).toHaveCount(0);
  await expect(page.getByTestId("share-button")).toBeVisible();

  await page.getByLabel("More actions for this post").click();
  await page.getByRole("button", { name: "Unpublish" }).click();
  await expect(page).toHaveURL(new RegExp(`${path}\\?saved=unpublished$`));
  await expect(page.getByTestId("post-toast")).toHaveText(
    "Taken down. It is a draft again.",
  );
  await expect(page.getByTestId("post-status-note")).toHaveText(
    "Draft. Nobody else can see this page until you publish it.",
  );
  // A draft's link is a 404 for everyone else, so there is nothing to share.
  await expect(page.getByTestId("share-button")).toHaveCount(0);
  // A draft has nothing to unpublish.
  await page.getByLabel("More actions for this post").click();
  await expect(page.getByRole("button", { name: "Unpublish" })).toHaveCount(0);
  await page.getByLabel("More actions for this post").click();

  // Theo is trusted, so Publish goes straight up and stays on the post page.
  await page.getByTestId("post-publish").click();
  await expect(page).toHaveURL(new RegExp(`${path}\\?saved=published$`));
  await expect(page.getByTestId("post-toast")).toHaveText("Published.");
  await expect(page.getByTestId("post-status-note")).toHaveCount(0);
  await expect(page.getByTestId("post-publish")).toHaveCount(0);
  await expect(page.getByTestId("share-button")).toBeVisible();

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

// The byline wraps, so the ⋯ can sit at the left or the right of the screen. A private
// post has no Share button, so its ⋯ is the last thing on the line.
for (const { visibility, width } of [
  { visibility: "Public", width: 390 },
  { visibility: "Private", width: 390 },
  { visibility: "Private", width: 600 },
  { visibility: "Private", width: 1280 },
]) {
  test(`the menu opens inside the screen: ${visibility} post, ${String(width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await devSignIn(page, THEO);
    await page.goto("/write");
    await page
      .getByLabel("Title")
      .fill(`Menu ${String(width)} ${Date.now().toString(36)}`);
    await fillBodyMarkdown(page, "Short.");
    await page.getByLabel(new RegExp(`^${visibility} ·`)).check();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page).toHaveURL(/\/@theo\/[a-z0-9-]+$/);

    await page.getByLabel("More actions for this post").click();
    const history = page.getByRole("link", { name: "History" });
    await expect(history).toBeVisible();
    // The menu picks its side when it opens, one render after the click.
    await expect
      .poll(async () => {
        const box = await history.boundingBox();
        return box !== null && box.x >= 0 && box.x + box.width <= width;
      })
      .toBe(true);

    await page.getByTestId("post-edit").click();
    await deleteCurrentPost(page);
  });
}
