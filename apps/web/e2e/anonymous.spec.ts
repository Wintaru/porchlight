import { expect, test } from "@playwright/test";

import { devSignIn, THEO } from "./helpers";

// The issue #8 acceptance test: a visitor posts anonymously, sees it pending on the
// status page with a claim code, signs in, claims it, and the old `/p/slug` URL 301s
// to `/@handle/slug`. Runs against the seeded local stack (docs/setup/supabase.md).
// The claiming member deletes the claimed post at the end, so the seed is the same for
// the next run.

test("a visitor posts anonymously, checks its status, claims it after signing in, and the old URL redirects", async ({
  page,
}) => {
  const stamp = Date.now().toString(36);
  const title = `Anonymous post ${stamp}`;

  await page.goto("/p/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Body (markdown)").fill("Written from the porch, no account.");
  await page.getByRole("button", { name: "Post anonymously" }).click();

  // Lands on the status page: nothing anonymous shows anywhere else until an admin
  // approves it, not even to the person who just wrote it.
  await expect(page).toHaveURL(/\/anon$/);
  await expect(page.getByTestId("claim-code")).toBeVisible();
  const item = page.getByTestId("anonymous-item").filter({ hasText: title });
  await expect(item).toBeVisible();
  await expect(item.getByTestId("anonymous-item-status")).toHaveText(
    "Waiting for approval",
  );
  await expect(item).toContainText("0 replies");
  const anonymousUrl = await item.getByTestId("anonymous-item-link").getAttribute("href");
  expect(anonymousUrl).toMatch(/^\/p\//);

  // Sign in, then come back to the same cookie's status page and claim it.
  await devSignIn(page, THEO);
  await page.goto("/anon");
  await page.getByTestId("claim-button").click();
  await expect(page.getByTestId("claim-status")).toHaveText(
    "Claimed. These are yours now.",
  );

  // The old URL now redirects to the claiming member's own post page.
  await page.goto(anonymousUrl ?? "/p/not-a-real-slug");
  await expect(page).toHaveURL(new RegExp(`/@${THEO.handle}/`));
  await expect(page.getByTestId("post-status-note")).toContainText(
    "Waiting for approval",
  );

  // Clean up through the normal editor, now that it is a real post there.
  await page.goto("/write");
  await page.getByTestId("my-posts").getByRole("link", { name: title }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/write\?deleted=1$/);
  await expect(page.getByTestId("form-status")).toHaveText("Deleted.");
});
