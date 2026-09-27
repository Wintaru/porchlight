import { expect, test } from "@playwright/test";

import {
  deleteCurrentPost,
  devSignIn,
  fillBodyMarkdown,
  JUNE,
  LAMPLIGHTER,
  THEO,
} from "./helpers";

// Issue #24's acceptance test: with two authors, June follows Theo, and Theo's next
// published post shows in June's Following tab and lights her bell. The seed has two
// authors with public posts, so the tabs show. Everything is put back at the end:
// deleting the post takes its notices with it.

test("follow an author, and their next post shows in Following and the bell", async ({
  page,
  browser,
}) => {
  const june = await browser.newPage();
  await devSignIn(june, JUNE);
  await june.goto("/@theo");
  await june.getByTestId("follow-button").click();
  await expect(june.getByTestId("follow-status")).toContainText("Following.");
  await expect(june.getByTestId("follow-button")).toHaveText("Unfollow");

  await june.goto("/");
  await expect(june.getByRole("link", { name: "Everything" })).toBeVisible();

  const title = `Followed ${Date.now().toString(36)}`;
  await devSignIn(page, THEO);
  await page.goto("/write");
  await page.getByLabel("Title").fill(title);
  await fillBodyMarkdown(page, "For the people who follow me.");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(/\/@theo\/followed-/);

  await june.goto("/");
  await june.getByRole("link", { name: "Following" }).click();
  await expect(june).toHaveURL(/\/\?feed=following$/);
  await expect(june.getByTestId("post-card").first().getByRole("heading")).toHaveText(
    title,
  );
  await june.getByTestId("notification-bell").click();
  await expect(june.getByTestId("notification-item").first()).toContainText(
    "Someone you follow published a post",
  );

  await june.goto("/@theo");
  await june.getByTestId("follow-button").click();
  await expect(june.getByTestId("follow-status")).toHaveText("Unfollowed.");
  await june.goto("/?feed=following");
  await expect(june.getByTestId("post-card").filter({ hasText: title })).toHaveCount(0);
  await june.close();

  await page.getByTestId("post-edit").click();
  await deleteCurrentPost(page);
});

test("a tag can be followed from its page, and a visitor sees no Follow", async ({
  page,
}) => {
  await page.goto("/t/making");
  await expect(page.getByTestId("follow-button")).toHaveCount(0);

  await devSignIn(page, JUNE);
  await page.goto("/t/making");
  await page.getByTestId("follow-button").click();
  await expect(page.getByTestId("follow-status")).toContainText("Following.");
  await page.getByTestId("follow-button").click();
  await expect(page.getByTestId("follow-status")).toHaveText("Unfollowed.");
  await expect(page.getByTestId("follow-button")).toHaveText("Follow");
});

test("an admin describes a tag, a reader sees it, and a member gets no form", async ({
  page,
  browser,
}) => {
  await devSignIn(page, LAMPLIGHTER);
  await page.goto("/t/making");
  await page.getByText("Add a description").click();
  await page.getByLabel("Description (markdown)").fill("Things made **by hand**.");
  await page.getByRole("button", { name: "Save description" }).click();
  await expect(page.getByTestId("described-status")).toHaveText("Description saved.");

  const reader = await browser.newPage();
  await reader.goto("/t/making");
  await expect(reader.getByTestId("tag-description").locator("strong")).toHaveText(
    "by hand",
  );
  await devSignIn(reader, JUNE);
  await reader.goto("/t/making");
  await expect(reader.getByText("Edit the description")).toHaveCount(0);
  await reader.close();

  // Put the seed back: an empty description clears it.
  await page.getByText("Edit the description").click();
  await page.getByLabel("Description (markdown)").fill("");
  await page.getByRole("button", { name: "Save description" }).click();
  await expect(page.getByTestId("tag-description")).toHaveCount(0);
});
