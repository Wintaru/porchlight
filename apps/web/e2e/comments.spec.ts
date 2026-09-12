import { expect, type Locator, type Page, test } from "@playwright/test";

import {
  deleteCurrentPost,
  devSignIn,
  fillBodyMarkdown,
  JUNE,
  type SeedMember,
  THEO,
} from "./helpers";

// The issue #7 acceptance test: comment → reply → delete, a 7-deep chain that renders
// at 6 levels, a tombstone where a deleted parent was, and a post with comments off
// that shows its comments but no form. Runs against the seeded local stack
// (docs/setup/supabase.md). Every post a test creates, it deletes at the end, and
// comments go with it (D6), so the seed is the same for the next run.
const SEED_POST = "/@theo/hello-from-the-porch";

// Publishes a fresh post as the member and lands on its page. The post id is on the
// comment form, for the tests that edit the post afterwards.
async function publishPost(
  page: Page,
  member: SeedMember,
  title: string,
): Promise<{ readonly url: string; readonly id: string }> {
  await devSignIn(page, member);
  await page.goto("/write");
  await page.getByLabel("Title").fill(title);
  await fillBodyMarkdown(page, "A post to talk under.");
  await page.getByLabel(/^Public/).check();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(new RegExp(`/@${member.handle}/`));
  const id = await page
    .getByTestId("comment-form")
    .locator('input[name="postId"]')
    .inputValue();
  return { url: new URL(page.url()).pathname, id };
}

async function comment(page: Page, body: string): Promise<Locator> {
  await page.getByTestId("comment-form").getByLabel("Your comment").fill(body);
  await page.getByTestId("comment-form").getByRole("button", { name: "Comment" }).click();
  await expect(page.getByTestId("comment-notice")).toHaveText("Posted.");
  const row = page.getByTestId("comment").filter({ hasText: body });
  await expect(row).toBeVisible();
  return row;
}

async function reply(page: Page, parent: Locator, body: string): Promise<Locator> {
  await parent.locator("summary", { hasText: "Reply" }).click();
  await parent.getByTestId("reply-form").getByLabel("Your reply").fill(body);
  await parent.getByTestId("reply-form").getByRole("button", { name: "Reply" }).click();
  await expect(page.getByTestId("comment-notice")).toHaveText("Posted.");
  const row = page.getByTestId("comment").filter({ hasText: body });
  await expect(row).toBeVisible();
  return row;
}

test("a visitor reads the seeded thread, the tombstone and the counts, with no form", async ({
  page,
}) => {
  await page.goto(SEED_POST);
  // Three visible comments; the tombstone and the pending one do not count.
  await expect(page.getByTestId("comment-count")).toHaveText("3 comments");
  await expect(page.getByTestId("comment-form")).toHaveCount(0);
  await expect(page.getByTestId("comment-sign-in")).toContainText("Sign in");
  await expect(page.getByText("Can I see it sometime?")).toHaveCount(0);

  const tombstone = page.getByTestId("comment-tombstone");
  await expect(tombstone).toContainText("[deleted]");
  await expect(tombstone).toContainText("This comment was erased by its author.");
  await expect(
    page.getByTestId("comment").filter({ hasText: "This reply stays readable" }),
  ).toHaveAttribute("data-depth", "1");

  // The seeded reactions: a heart and a clap on the post, a laugh on the first
  // comment. Read-only for a visitor: counts, no buttons.
  const postReactions = page.getByTestId("post-reactions");
  await expect(postReactions.getByTestId("reaction-count-heart")).toHaveText("1");
  await expect(postReactions.getByTestId("reaction-count-clap")).toHaveText("1");
  await expect(postReactions.getByRole("button")).toHaveCount(0);
  const first = page
    .getByTestId("comment")
    .filter({ hasText: "The wobble is character." });
  await expect(first.getByTestId("reaction-count-laugh")).toHaveText("1");
  await expect(first.getByText("author")).toHaveCount(0);
  await expect(
    page
      .getByTestId("comment")
      .filter({ hasText: "I will tell the bench" })
      .getByText("author"),
  ).toBeVisible();
});

test("comment → reply → delete: a deleted parent leaves a [deleted] slot, a leaf is gone", async ({
  page,
}) => {
  const stamp = Date.now().toString(36);
  const post = await publishPost(page, THEO, `Talk under this ${stamp}`);
  await expect(page.getByTestId("comment-count")).toHaveText("0 comments");

  const root = await comment(page, `Root ${stamp}`);
  await expect(root).toHaveAttribute("data-depth", "0");
  await expect(root.getByText("author")).toBeVisible();
  const child = await reply(page, root, `Child ${stamp}`);
  await expect(child).toHaveAttribute("data-depth", "1");
  await expect(page.getByTestId("comment-count")).toHaveText("2 comments");

  // The parent has a reply, so it becomes a tombstone and the reply stays.
  await root.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByTestId("comment-notice")).toHaveText(
    "Deleted. The replies under it stay.",
  );
  await expect(page.getByTestId("comment-tombstone")).toContainText("[deleted]");
  await expect(
    page.getByTestId("comment").filter({ hasText: `Child ${stamp}` }),
  ).toBeVisible();
  await expect(page.getByTestId("comment-count")).toHaveText("1 comment");

  // The reply has nothing under it, so it is gone for good.
  await page
    .getByTestId("comment")
    .filter({ hasText: `Child ${stamp}` })
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByTestId("comment-notice")).toHaveText("Deleted.");
  await expect(page.getByTestId("comment")).toHaveCount(0);

  await page.goto(`/write/${post.id}`);
  await deleteCurrentPost(page);
});

test("a 7-deep reply chain renders at 6 levels and the last reply names who it answers (D10)", async ({
  page,
}) => {
  const stamp = Date.now().toString(36);
  const post = await publishPost(page, THEO, `Deep thread ${stamp}`);

  let parent = await comment(page, `Level 0 ${stamp}`);
  for (let level = 1; level <= 7; level += 1) {
    parent = await reply(page, parent, `Level ${String(level)} ${stamp}`);
  }

  const rows = page.getByTestId("comment");
  await expect(rows).toHaveCount(8);
  const depths = await rows.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-depth")),
  );
  expect(depths).toEqual(["0", "1", "2", "3", "4", "5", "6", "6"]);
  const last = rows.filter({ hasText: `Level 7 ${stamp}` });
  await expect(last.getByTestId("comment-body")).toHaveText(`@theo Level 7 ${stamp}`);
  // The seventh sits beside the sixth, under the fifth: the same list, one step in.
  const sixthList = rows
    .filter({ hasText: `Level 6 ${stamp}` })
    .first()
    .locator("..");
  await expect(sixthList.locator("..").getByTestId("comment")).toHaveCount(2);

  await page.goto(`/write/${post.id}`);
  await deleteCurrentPost(page);
});

test("a post with comments off shows its comments but no form (D20)", async ({
  page,
}) => {
  const stamp = Date.now().toString(36);
  const post = await publishPost(page, THEO, `Closed later ${stamp}`);
  await comment(page, `Before the close ${stamp}`);

  await page.goto(`/write/${post.id}`);
  await page.getByLabel("Allow comments").uncheck();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("form-status")).toHaveText("Saved.");

  await page.goto(post.url);
  await expect(page.getByTestId("comment-count")).toHaveText("1 comment");
  await expect(page.getByText(`Before the close ${stamp}`)).toBeVisible();
  await expect(page.getByTestId("comment-form")).toHaveCount(0);
  await expect(page.getByTestId("reply-form")).toHaveCount(0);
  await expect(page.locator("summary", { hasText: "Reply" })).toHaveCount(0);
  await expect(page.getByTestId("comment-sign-in")).toHaveCount(0);

  await page.goto(`/write/${post.id}`);
  await deleteCurrentPost(page);
});

test("a reaction toggles on and off for a member (D9)", async ({ page }) => {
  const stamp = Date.now().toString(36);
  const post = await publishPost(page, THEO, `React to this ${stamp}`);
  const heart = page.getByTestId("post-reactions").getByRole("button", { name: "Heart" });
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await expect(heart.getByTestId("reaction-count-heart")).toHaveText("0");

  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(heart.getByTestId("reaction-count-heart")).toHaveText("1");

  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await expect(heart.getByTestId("reaction-count-heart")).toHaveText("0");

  await page.goto(`/write/${post.id}`);
  await deleteCurrentPost(page);
});

test("a probation member's comment waits in the queue and is theirs alone to see", async ({
  page,
  browser,
}) => {
  const stamp = Date.now().toString(36);
  await devSignIn(page, JUNE);
  await page.goto(SEED_POST);
  await page
    .getByTestId("comment-form")
    .getByLabel("Your comment")
    .fill(`Queued ${stamp}`);
  await page.getByTestId("comment-form").getByRole("button", { name: "Comment" }).click();
  await expect(page.getByTestId("comment-notice")).toHaveText(
    "Sent to the queue. It shows once a moderator approves it.",
  );
  const queued = page.getByTestId("comment").filter({ hasText: `Queued ${stamp}` });
  await expect(queued).toHaveAttribute("data-status", "pending");
  await expect(queued.getByTestId("comment-status")).toContainText(
    "Waiting for approval",
  );

  // Nobody else sees it: a fresh, signed-out context.
  const visitor = await browser.newPage();
  await visitor.goto(SEED_POST);
  await expect(visitor.getByText(`Queued ${stamp}`)).toHaveCount(0);
  await visitor.close();

  // Her own pending comment has no replies, so deleting it removes it and the seed is
  // whole again.
  await queued.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByTestId("comment-notice")).toHaveText("Deleted.");
  await expect(page.getByText(`Queued ${stamp}`)).toHaveCount(0);
});
