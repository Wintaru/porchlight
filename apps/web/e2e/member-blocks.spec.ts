import { expect, test } from "@playwright/test";

import { devSignIn, JUNE, MIRA, THEO } from "./helpers";

// Issue #23: a member mutes or blocks another member from their profile page. A mute
// hides the other member's posts from the feed and their comments from threads; a block
// also closes the comment form on the blocker's posts. Settings lists both, with Undo.
// Every test takes its mute or block back at the end, so the seed is the same next run.

const THEO_POST = "/@theo/hello-from-the-porch";
const THEO_POST_TITLE = "Hello from the porch";

test("a mute hides the member's posts and comments, and Unmute brings them back", async ({
  page,
}) => {
  await devSignIn(page, JUNE);
  await page.goto("/");
  await expect(
    page.getByTestId("post-card").filter({ hasText: THEO_POST_TITLE }),
  ).toHaveCount(1);

  await page.goto("/@theo");
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await expect(page.getByTestId("block-status")).toHaveText(
    "Muted. Their posts and comments are hidden from you.",
  );
  await expect(page.getByRole("button", { name: "Unmute" })).toBeVisible();

  await page.goto("/");
  await expect(
    page.getByTestId("post-card").filter({ hasText: THEO_POST_TITLE }),
  ).toHaveCount(0);
  // A muted member's own post is still there by its link, but his comments on it are not.
  await page.goto(THEO_POST);
  await expect(page.getByTestId("comment-muted").first()).toBeVisible();
  await expect(page.getByTestId("comment").filter({ hasText: "@theo" })).toHaveCount(0);

  await page.goto("/settings#muted");
  const row = page.getByTestId("muted-member").filter({ hasText: "@theo" });
  await expect(row).toContainText("Muted");
  await row.getByRole("button", { name: "Unmute" }).click();
  await expect(page.getByTestId("block-status")).toHaveText(
    "Done. You see their posts and comments again.",
  );
  await expect(page.getByTestId("muted-empty")).toBeVisible();

  await page.goto("/");
  await expect(
    page.getByTestId("post-card").filter({ hasText: THEO_POST_TITLE }),
  ).toHaveCount(1);
});

test("a block closes the comment form on the blocker's posts until Unblock", async ({
  page,
  browser,
}) => {
  const june = await browser.newPage();
  await devSignIn(june, JUNE);
  await june.goto(THEO_POST);
  await expect(june.getByTestId("comment-form")).toBeVisible();

  await devSignIn(page, THEO);
  await page.goto("/@june");
  await page.getByRole("button", { name: "Block", exact: true }).click();
  await expect(page.getByTestId("block-status")).toContainText("Blocked.");

  await june.reload();
  await expect(june.getByTestId("comment-form")).toHaveCount(0);
  // June is never told: her view of Theo's page has no sign of the block.
  await june.goto("/@theo");
  await expect(june.getByRole("button", { name: "Mute", exact: true })).toBeVisible();

  await page.goto("/settings#muted");
  const row = page.getByTestId("muted-member").filter({ hasText: "@june" });
  await expect(row).toContainText("Blocked");
  await row.getByRole("button", { name: "Unblock" }).click();
  await expect(page.getByTestId("muted-empty")).toBeVisible();

  await june.goto(THEO_POST);
  await expect(june.getByTestId("comment-form")).toBeVisible();
  await june.close();
});

// #85: June is on probation, so her comment waits. Theo blocks her before a moderator
// looks. Mira's approval then becomes a rejection: the comment never shows on Theo's
// post, and June sees it rejected with no word of the block. June deletes it at the
// end and Theo unblocks her, so the seed is the same next run.
test("a held comment from a member the author blocked is rejected on approval", async ({
  page,
  browser,
}) => {
  const body = `Held then blocked ${Date.now().toString(36)}`;
  const june = await browser.newPage();
  await devSignIn(june, JUNE);
  await june.goto(THEO_POST);
  await june.getByTestId("comment-form").getByLabel("Your comment").fill(body);
  await june.getByTestId("comment-form").getByRole("button", { name: "Comment" }).click();
  await expect(june.getByTestId("comment-notice")).toHaveText(
    "Sent to the queue. It shows once a moderator approves it.",
  );

  await devSignIn(page, THEO);
  await page.goto("/@june");
  await page.getByRole("button", { name: "Block", exact: true }).click();
  await expect(page.getByTestId("block-status")).toContainText("Blocked.");

  // Theo's block must go even when a step fails, or every later block test starts wrong.
  try {
    const mira = await browser.newPage();
    await devSignIn(mira, MIRA);
    await mira.goto("/mod/queue");
    const item = mira.getByTestId("queue-item").filter({ hasText: body });
    await expect(item).toHaveCount(1);
    await item.getByTestId("queue-approve").click();
    await expect(mira.getByTestId("queue-status")).toHaveText(
      "Not approved. A member in that thread blocked the writer, so it was rejected.",
    );
    await expect(mira.getByTestId("queue-item").filter({ hasText: body })).toHaveCount(0);
    await mira.close();

    const visitor = await browser.newPage();
    await visitor.goto(THEO_POST);
    await expect(visitor.getByText(body)).toHaveCount(0);
    await visitor.close();

    await june.goto(THEO_POST);
    const own = june.getByTestId("comment").filter({ hasText: body });
    await expect(own).toHaveAttribute("data-status", "rejected");
    await own.getByRole("button", { name: "Delete" }).click();
    await expect(june.getByText(body)).toHaveCount(0);
    await june.close();
  } finally {
    await page.goto("/settings#muted");
    await page
      .getByTestId("muted-member")
      .filter({ hasText: "@june" })
      .getByRole("button", { name: "Unblock" })
      .click();
    await expect(page.getByTestId("muted-empty")).toBeVisible();
  }
});
