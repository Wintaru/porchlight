import { expect, test } from "@playwright/test";

import { devSignIn, JUNE } from "./helpers";

// Issue #23: full-text search over public posts and visible comments. A term matches
// as a prefix, a match is highlighted as text, a pending comment is never found, and a
// member the searcher muted is left out. The mute is taken back at the end.

test("the header's Search finds a post by a word prefix and a comment by its words", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Search", exact: true }).first().click();
  await expect(page).toHaveURL(/\/search$/);

  await page.getByRole("searchbox").fill("benc");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/search\?q=benc$/);
  const posts = page.getByTestId("search-posts");
  await expect(posts.getByRole("link", { name: "Hello from the porch" })).toBeVisible();
  await expect(posts.locator("mark").first()).toHaveText(/^bench/i);

  await page.goto("/search?q=wobble character");
  const comments = page.getByTestId("search-comments");
  await expect(comments.getByTestId("search-hit")).toHaveCount(1);
  await comments.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/@theo\/hello-from-the-porch#comment-/);

  // A pending comment is not on the page yet, so search does not find it either.
  await page.goto("/search?q=sometime");
  await expect(page.getByTestId("search-empty")).toBeVisible();
});

test("query syntax is only words, and a muted member's post is not found", async ({
  page,
}) => {
  await page.goto("/search?q=" + encodeURIComponent("porch:* | !hello & ("));
  await expect(page.getByTestId("search-posts")).toBeVisible();

  await devSignIn(page, JUNE);
  await page.goto("/@theo");
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await expect(page.getByTestId("block-status")).toContainText("Muted.");
  await page.goto("/search?q=hello porch");
  await expect(page.getByTestId("search-empty")).toBeVisible();

  await page.goto("/@theo");
  await page.getByRole("button", { name: "Unmute" }).click();
  await expect(page.getByTestId("block-status")).toContainText("Done.");
  await page.goto("/search?q=hello porch");
  await expect(
    page.getByTestId("search-posts").getByRole("link", { name: "Hello from the porch" }),
  ).toBeVisible();
});
