import { expect, test } from "@playwright/test";

import { devSignIn, THEO } from "./helpers";

// Issue #16's Profile board: avatar, bio, RSS (never Mute — phase 2), Posts/Comments
// tabs, and the "no totals, no rankings" footer line. Runs against the seeded local
// stack (docs/setup/supabase.md). Most of these read only; the visibility-leak test
// writes a comment and deletes it at the end, same convention as comments.spec.ts.

test("the profile page shows the Posts tab by default, an RSS link, and never a Mute button", async ({
  page,
}) => {
  await page.goto("/@theo");
  await expect(page.getByTestId("author-handle")).toHaveText("@theo");
  await expect(page.getByRole("link", { name: "RSS" })).toHaveAttribute(
    "href",
    "/@theo/feed.xml",
  );
  await expect(page.getByRole("button", { name: "Mute" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Mute" })).toHaveCount(0);
  await expect(
    page.getByText(
      "No totals, no rankings. Reactions live on the posts, not the person.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Posts", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByText("Hello from the porch")).toBeVisible();
});

test("the Comments tab shows the author's own visible comments, linked back to their post", async ({
  page,
}) => {
  await page.goto("/@theo?tab=comments");
  await expect(page.getByRole("link", { name: "Comments", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByText("I will tell the bench you said so.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Hello from the porch" })).toHaveAttribute(
    "href",
    "/@theo/hello-from-the-porch",
  );
});

test("a comment on an unlisted post never surfaces on the Comments tab (D9's unlisted rule)", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  await page.goto("/@theo/an-unlisted-note");
  const body = `An unlisted-only comment ${Date.now().toString(36)}`;
  await page.getByTestId("comment-form").getByLabel("Your comment").fill(body);
  await page.getByTestId("comment-form").getByRole("button", { name: "Comment" }).click();
  await expect(page.getByTestId("comment-notice")).toHaveText("Posted.");
  const row = page.getByTestId("comment").filter({ hasText: body });
  await expect(row).toBeVisible();

  await page.goto("/@theo?tab=comments");
  await expect(page.getByText(body)).toHaveCount(0);
  await expect(page.getByText("An unlisted note")).toHaveCount(0);

  await page.goto("/@theo/an-unlisted-note");
  await page
    .getByTestId("comment")
    .filter({ hasText: body })
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByTestId("comment-notice")).toHaveText("Deleted.");
});
