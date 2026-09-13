import { expect, test } from "@playwright/test";

import {
  deleteCurrentPost,
  devSignIn,
  fillBodyMarkdown,
  JUNE,
  LAMPLIGHTER,
  MIRA,
} from "./helpers";

// Issue #11's acceptance test: an anonymous post reaches the queue and a moderator
// approves it, and a probation member's post is rejected with a reason the author then
// sees. Runs against the seeded local stack (docs/setup/supabase.md).

test("an anonymous post reaches the queue and a moderator approves it", async ({
  page,
  browser,
}) => {
  const stamp = Date.now().toString(36);
  const title = `Porch raccoon sighting ${stamp}`;
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  await page.goto("/p/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Body (markdown)").fill("Right on the porch rail.");
  await page.getByRole("button", { name: "Post anonymously" }).click();
  await expect(page).toHaveURL(/\/anon$/);

  const mod = await browser.newPage();
  await devSignIn(mod, MIRA);
  await mod.goto("/mod/queue?filter=anonymous");
  const item = mod.getByTestId("queue-item").filter({ hasText: title });
  await expect(item).toBeVisible();
  const postId = await item.locator('input[name="targetId"]').inputValue();
  await item.getByTestId("queue-approve").click();
  await expect(mod).toHaveURL(/\/mod\/queue\?done=approved$/);
  await mod.close();

  const visitor = await browser.newPage();
  const response = await visitor.goto(`/p/${slug}`);
  expect(response?.status()).toBe(200);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(title);
  await visitor.close();

  // Cleanup: an anonymous author has no session to delete through, so an admin does it
  // (mayEditPost allows the author or an admin), keeping the seed the same for the
  // next run.
  const admin = await browser.newPage();
  await devSignIn(admin, LAMPLIGHTER);
  await admin.goto(`/write/${postId}`);
  await deleteCurrentPost(admin);
  await admin.close();
});

test("a probation member's post is rejected with a reason the author then sees", async ({
  page,
  browser,
}) => {
  await devSignIn(page, JUNE);
  await page.goto("/write");
  const stamp = Date.now().toString(36);
  const title = `A probation post ${stamp}`;
  await page.getByLabel("Title").fill(title);
  await fillBodyMarkdown(page, "Hello, porch.");
  await page.getByLabel("Summary for the preview card").fill("");
  await page.getByLabel(/^Public/).check();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(/\/write\/([0-9a-f-]+)\?saved=pending$/);
  const postUrl = new URL(page.url());
  const postId = /\/write\/([0-9a-f-]+)/.exec(postUrl.pathname)?.[1];
  if (postId === undefined) {
    throw new Error("post id missing from the editor URL");
  }

  const mod = await browser.newPage();
  await devSignIn(mod, MIRA);
  await mod.goto("/mod/queue?filter=probation");
  const item = mod.getByTestId("queue-item").filter({ hasText: title });
  await expect(item).toBeVisible();
  await item.getByLabel(/^Reason/).fill("Off-topic for this porch.");
  await item.getByTestId("queue-reject").click();
  await expect(mod).toHaveURL(/\/mod\/queue\?done=rejected$/);
  await mod.close();

  await page.goto(`/write/${postId}`);
  await expect(page.getByTestId("post-status")).toHaveText("Rejected by a moderator");
  await expect(page.getByTestId("post-rejection-reason")).toHaveText(
    "Reason: Off-topic for this porch.",
  );
  await deleteCurrentPost(page);
});
