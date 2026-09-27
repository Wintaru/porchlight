import { expect, test } from "@playwright/test";

import { devSignIn, JUNE, THEO } from "./helpers";

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
