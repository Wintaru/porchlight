import { expect, test } from "@playwright/test";

import {
  deleteCurrentPost,
  devSignIn,
  fillBodyMarkdown,
  JUNE,
  MIRA,
  THEO,
} from "./helpers";

// Issue #13's acceptance test: a reply approved by a mod lights the author's bell
// without a reload, and a pending reply does not. Runs against the seeded local stack
// (docs/setup/supabase.md), with three signed-in pages open at once so Theo's bell can
// be watched live while June replies and Mira decides it.

test("a pending reply does not light the bell; approving it does, without a reload", async ({
  browser,
}) => {
  const stamp = Date.now().toString(36);
  const title = `Notify me ${stamp}`;
  const rootBody = `Root comment ${stamp}`;
  const replyBody = `A reply worth noticing ${stamp}`;

  const author = await browser.newPage();
  await devSignIn(author, THEO);
  await author.goto("/write");
  await author.getByLabel("Title").fill(title);
  await fillBodyMarkdown(author, "A post to reply under.");
  await author.getByLabel(/^Public/).check();
  await author.getByRole("button", { name: "Publish" }).click();
  await expect(author).toHaveURL(new RegExp(`/@${THEO.handle}/`));
  const postUrl = new URL(author.url()).pathname;
  const postId = await author
    .getByTestId("comment-form")
    .locator('input[name="postId"]')
    .inputValue();

  await author.getByTestId("comment-form").getByLabel("Your comment").fill(rootBody);
  await author
    .getByTestId("comment-form")
    .getByRole("button", { name: "Comment" })
    .click();
  await expect(author.getByTestId("comment-notice")).toHaveText("Posted.");
  const root = author.getByTestId("comment").filter({ hasText: rootBody });
  await expect(root).toBeVisible();

  // Theo stays on the post page, bell open, watching for it to light up live.
  await author.getByTestId("notification-bell").click();
  await expect(author.getByTestId("notification-empty")).toBeVisible();

  const replier = await browser.newPage();
  await devSignIn(replier, JUNE);
  await replier.goto(postUrl);
  const parent = replier.getByTestId("comment").filter({ hasText: rootBody });
  await parent.locator("summary", { hasText: "Reply" }).click();
  await parent.getByTestId("reply-form").getByLabel("Your reply").fill(replyBody);
  await parent.getByTestId("reply-form").getByRole("button", { name: "Reply" }).click();
  await expect(replier.getByTestId("comment-notice")).toHaveText(
    "Sent to the queue. It shows once a moderator approves it.",
  );

  // June is on probation (D7): a fresh, unauthenticated view of the same page does not
  // render her reply yet. (`comments_own_read` would let June see her own pending row
  // on a page she loads herself, so this checks a page nobody's session can special-case.)
  const visitor = await browser.newPage();
  await visitor.goto(postUrl);
  await expect(visitor.getByTestId("comment").filter({ hasText: replyBody })).toHaveCount(
    0,
  );
  await visitor.close();

  // Still nothing for Theo, with no reload of his own.
  await expect(author.getByTestId("notification-empty")).toBeVisible();
  await expect(author.getByTestId("notification-unread-count")).toHaveCount(0);

  const mod = await browser.newPage();
  await devSignIn(mod, MIRA);
  await mod.goto("/mod/queue?filter=probation");
  const item = mod.getByTestId("queue-item").filter({ hasText: replyBody });
  await expect(item).toBeVisible();
  await item.getByTestId("queue-approve").click();
  await expect(mod).toHaveURL(/\/mod\/queue\?done=approved$/);
  await mod.close();

  // The reply is now visible to everyone, June's own page included.
  await replier.reload();
  await expect(
    replier.getByTestId("comment").filter({ hasText: replyBody }),
  ).toBeVisible();
  await replier.close();

  // Theo's bell lights up on the page he never left or reloaded: the Realtime row
  // Approve wrote landed through the open subscription, not a fresh page load.
  await expect(author.getByTestId("notification-unread-count")).toHaveText("(1)");
  const notice = author.getByTestId("notification-item");
  await expect(notice).toHaveText("Someone replied to your comment");
  await expect(notice).toHaveAttribute("data-kind", "reply.created");
  await expect(notice).toHaveAttribute("data-read", "false");

  // Clicking it marks it read, still with no reload.
  await notice.click();
  await expect(notice).toHaveAttribute("data-read", "true");

  await author.goto(`/write/${postId}`);
  await deleteCurrentPost(author);
  await author.close();
});

test("the bell's panel opens, and closes with its button, Escape or a click away", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  const bell = page.getByTestId("notification-bell");
  const panel = page.getByRole("region", { name: "Notifications" });
  await expect(bell).toHaveAttribute("aria-expanded", "false");

  await bell.click();
  await expect(bell).toHaveAttribute("aria-expanded", "true");
  // A click inside the panel is not a click away.
  await panel.click();
  await expect(panel).toBeVisible();
  await bell.click();
  await expect(panel).toBeHidden();

  await bell.click();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(bell).toBeFocused();

  await bell.click();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(panel).toBeHidden();
  await expect(bell).toHaveAttribute("aria-expanded", "false");
});
