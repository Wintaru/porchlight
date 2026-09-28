import { expect, type Locator, type Page, test } from "@playwright/test";

import {
  deleteCurrentPost,
  devSignIn,
  fillBodyMarkdown,
  insertUpload,
  THEO,
} from "./helpers";
import { rest } from "./service-rest";

// Issue #80: an upload belongs to one post, and the editor lists only that post's. One
// taken out of the post is deleted when the author presses Save; autosave never
// deletes, so an upload taken out and put back before Save survives. One uploaded and
// not put in yet stays for later. Deleting the post deletes its uploads. A file a
// comment shows is never deleted, and Remove refuses it with the reason (#90).

const PDF = Buffer.from("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<<>>\nendobj\n");

function row(page: Page, name: string): Locator {
  return page.getByTestId("attachment").filter({ hasText: name });
}

async function upload(page: Page, name: string): Promise<void> {
  await page
    .getByTestId("attachment-drop")
    .locator('input[type="file"]')
    .setInputFiles({ name, mimeType: "application/pdf", buffer: PDF });
  await expect(row(page, name).getByRole("button", { name: "Remove" })).toBeVisible();
}

// A new post with a title, saved by autosave so the editor has its id.
async function newPost(page: Page, title: string): Promise<void> {
  await page.goto("/write");
  await page.getByLabel("Title").fill(title);
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]{36}$/);
}

test("an upload taken out of a post goes on Save, not on autosave", async ({ page }) => {
  const stamp = Date.now().toString(36);
  const name = `notes-${stamp}.pdf`;
  await devSignIn(page, THEO);
  await newPost(page, `Porch notes ${stamp}`);

  await upload(page, name);
  await insertUpload(row(page, name));
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\?saved=draft$/);
  await expect(row(page, name)).toBeVisible();

  // Taken out, and the draft autosaves: the upload is still there after a reload.
  await fillBodyMarkdown(page, "No file in this one after all.");
  await expect(page.getByTestId("save-state")).toHaveText("Draft saved a moment ago");
  await page.reload();
  await expect(row(page, name)).toBeVisible();

  // Save deletes it.
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\?saved=draft$/);
  await expect(page.getByTestId("attachment-drop")).toBeVisible();
  await expect(row(page, name)).toHaveCount(0);

  await deleteCurrentPost(page);
});

test("a post lists only its own uploads, keeps one not put in yet, and takes them when deleted", async ({
  page,
}) => {
  const stamp = Date.now().toString(36);
  const mine = `plans-${stamp}.pdf`;
  const other = `other-${stamp}.pdf`;
  await devSignIn(page, THEO);

  await newPost(page, `Other ${stamp}`);
  await upload(page, other);
  const otherEditor = page.url();

  await newPost(page, `Plans ${stamp}`);
  await expect(page.getByTestId("attachment-drop")).toBeVisible();
  await expect(row(page, other)).toHaveCount(0);
  await upload(page, mine);

  // Save keeps an upload that was never in the post.
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\?saved=draft$/);
  await expect(row(page, mine)).toBeVisible();
  await expect(row(page, other)).toHaveCount(0);

  await deleteCurrentPost(page);
  await page.goto(otherEditor);
  await expect(row(page, other)).toBeVisible();
  await deleteCurrentPost(page);
});

test("an upload made before a new post has an id joins it, and one in no post stays reachable", async ({
  page,
}) => {
  const stamp = Date.now().toString(36);
  const early = `early-${stamp}.pdf`;
  const loose = `loose-${stamp}.pdf`;
  await devSignIn(page, THEO);

  // Uploaded on a page that never becomes a post: it is in no post.
  await page.goto("/write");
  await upload(page, loose);

  // Uploaded before the title, so before autosave gives the post an id.
  await page.goto("/write");
  await upload(page, early);
  await page.getByLabel("Title").fill(`Early ${stamp}`);
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId("unattached-uploads")).toContainText(loose);
  // The attach runs once the id arrives; a reload shows the upload as the post's own.
  await expect
    .poll(async () => {
      await page.reload();
      return row(page, early)
        .waitFor({ timeout: 2000 })
        .then(
          () => true,
          () => false,
        );
    })
    .toBe(true);

  // The upload in no post can still be removed from here.
  const looseRow = page.getByTestId("unattached-upload").filter({ hasText: loose });
  await page.getByTestId("unattached-uploads").locator("summary").click();
  await looseRow.getByRole("button", { name: "Remove" }).click();
  await expect(looseRow).toHaveCount(0);

  await deleteCurrentPost(page);
});

async function idOf(query: string): Promise<string> {
  const rows = (await (await rest(query, { method: "GET" })).json()) as { id: string }[];
  const id = rows[0]?.id;
  if (id === undefined) {
    throw new Error(`nothing found for ${query}`);
  }
  return id;
}

test("a file a comment shows is never pruned, and Remove says why (#90)", async ({
  page,
}) => {
  const stamp = Date.now().toString(36);
  const name = `quoted-${stamp}.pdf`;
  await devSignIn(page, THEO);
  await newPost(page, `Quoted ${stamp}`);
  await upload(page, name);
  await insertUpload(row(page, name));
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\?saved=draft$/);

  // Someone quotes the file in a comment on a published post.
  const mediaId = await idOf(`media_assets?select=id&original_filename=eq.${name}`);
  const theoId = await idOf("profiles?select=id&handle=eq.theo");
  const postId = await idOf("posts?select=id&status=eq.published&limit=1");
  const commentId = (
    (await (
      await rest("comments?select=id", {
        method: "POST",
        prefer: "return=representation",
        body: JSON.stringify({
          post_id: postId,
          author_id: theoId,
          status: "visible",
          body_md: `Here is the list: https://x.test/public-media/${mediaId}.pdf`,
        }),
      })
    ).json()) as { id: string }[]
  )[0]?.id;
  if (commentId === undefined) {
    throw new Error("the comment was not stored");
  }
  try {
    // Taken out of the post and saved: the comment still shows it, so it stays.
    await fillBodyMarkdown(page, "The list is in the comments now.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/\?saved=draft$/);
    await expect(row(page, name)).toBeVisible();

    // A fresh load: the first server call after a Save's redirect remounts the editor,
    // which would drop the message (PHASE3-HANDOFF.md, #90).
    await page.goto(page.url().replace(/\?.*$/, ""));
    await row(page, name).getByRole("button", { name: "Remove" }).click();
    await expect(row(page, name).getByRole("alert")).toContainText(
      "a comment still shows this file",
    );
    await expect(row(page, name)).toBeVisible();

    // Once the comment is gone, Remove works.
    await rest(`comments?id=eq.${commentId}`, { method: "DELETE" });
    await row(page, name).getByRole("button", { name: "Remove" }).click();
    await expect(row(page, name)).toHaveCount(0);
  } finally {
    await rest(`comments?id=eq.${commentId}`, { method: "DELETE" });
  }
  await deleteCurrentPost(page);
});
