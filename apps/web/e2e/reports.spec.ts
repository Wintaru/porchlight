import { REPORT_REASONS } from "@porchlight/core";
import { type Browser, expect, type Page, test } from "@playwright/test";

import { REPORT_REASON_LABELS } from "../src/lib/report-reason-labels";
import {
  deleteCurrentPost,
  devSignIn,
  fillBodyMarkdown,
  JUNE,
  MIRA,
  THEO,
} from "./helpers";

// Issue #40: the Report link on a post and a comment, the report form, and the
// moderator's Reports page, where a report is dismissed or its item hidden. Every post
// a test writes, it deletes at the end, and its reports go with it.

async function publishAsTheo(browser: Browser, title: string): Promise<Page> {
  const theo = await browser.newPage();
  await devSignIn(theo, THEO);
  await theo.goto("/write");
  await theo.getByLabel("Title").fill(title);
  await fillBodyMarkdown(theo, "A post someone will report.");
  await theo.getByLabel(/^Public/).check();
  await theo.getByRole("button", { name: "Publish" }).click();
  await expect(theo).toHaveURL(/\/@theo\//);
  return theo;
}

async function deletePost(theo: Page, title: string): Promise<void> {
  await theo.goto("/write");
  await theo.getByTestId("my-posts").getByRole("link", { name: title }).click();
  await deleteCurrentPost(theo);
}

async function reportsAsMira(browser: Browser): Promise<Page> {
  const mira = await browser.newPage();
  await devSignIn(mira, MIRA);
  await mira.goto("/mod/reports");
  return mira;
}

test("a member reports a post, and a moderator dismisses it", async ({ browser }) => {
  const title = `Reported post ${Date.now().toString(36)}`;
  const theo = await publishAsTheo(browser, title);
  const postUrl = theo.url();
  // The author has no Report link on their own post.
  await expect(theo.getByTestId("post-report")).toHaveCount(0);

  const june = await browser.newPage();
  await devSignIn(june, JUNE);
  await june.goto(postUrl);
  await june.getByTestId("post-report").click();
  await expect(june.getByRole("heading", { level: 1 })).toHaveText("Report this post");
  await expect(june.getByTestId("report-item")).toContainText(title);
  // The reasons are the code of conduct's, in the same words.
  const options = june.getByTestId("report-reason").locator("option:not([disabled])");
  await expect(options).toHaveText(REPORT_REASONS.map((r) => REPORT_REASON_LABELS[r]));

  await june.getByLabel("Reason").selectOption("spam");
  await june.getByLabel("Details (optional)").fill("Links to a shop, nothing else.");
  await june.getByRole("button", { name: "Send report" }).click();
  await expect(june.getByTestId("report-sent")).toHaveText(
    "Thank you. A moderator will look at it.",
  );
  await june.getByRole("link", { name: "Back to where you were" }).click();
  await expect(june).toHaveURL(postUrl);

  const mira = await reportsAsMira(browser);
  const card = mira.getByTestId("reported-item").filter({ hasText: title });
  await expect(card.getByTestId("report-line-reason")).toHaveText("Spam");
  await expect(card).toContainText("Links to a shop, nothing else.");
  await expect(card).toContainText("a member");
  await expect(card.getByTestId("reported-item-escalated")).toHaveCount(0);
  await card.getByTestId("report-dismiss").click();
  await expect(mira.getByTestId("reports-status")).toHaveText(
    "Dismissed. The item stays as it is.",
  );
  await expect(mira.getByTestId("reported-item").filter({ hasText: title })).toHaveCount(
    0,
  );

  // Dismissing left the post up.
  expect((await june.goto(postUrl))?.status()).toBe(200);
  await deletePost(theo, title);
});

test("a visitor reports a comment as illegal content, and a moderator hides it", async ({
  browser,
}) => {
  const stamp = Date.now().toString(36);
  const title = `Post with a bad comment ${stamp}`;
  const words = `A comment to report ${stamp}`;
  const theo = await publishAsTheo(browser, title);
  const postUrl = theo.url();
  const june = await browser.newPage();
  await devSignIn(june, JUNE);
  await june.goto(postUrl);
  // June's own comment has no Report link for her.
  await june.getByTestId("comment-form").getByLabel("Your comment").fill(words);
  await june.getByTestId("comment-form").getByRole("button", { name: "Comment" }).click();
  // June is on probation: the comment waits for a moderator before anyone sees it.
  const mira = await browser.newPage();
  await devSignIn(mira, MIRA);
  await mira.goto("/mod/queue");
  await mira
    .getByTestId("queue-item")
    .filter({ hasText: words })
    .getByTestId("queue-approve")
    .click();
  await expect(mira.getByTestId("queue-status")).toHaveText("Approved.");
  await june.goto(postUrl);
  const ownRow = june.getByTestId("comment").filter({ hasText: words });
  await expect(ownRow.getByTestId("comment-report")).toHaveCount(0);

  const visitor = await browser.newPage();
  await visitor.goto(postUrl);
  await visitor
    .getByTestId("comment")
    .filter({ hasText: words })
    .getByTestId("comment-report")
    .click();
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(
    "Report this comment",
  );
  await expect(visitor.getByTestId("report-item")).toContainText(words);
  await visitor.getByLabel("Reason").selectOption("illegal_content");
  await visitor.getByRole("button", { name: "Send report" }).click();
  await expect(visitor.getByTestId("report-sent")).toContainText(
    "ahead of the usual queue",
  );

  await mira.goto("/mod/reports");
  const card = mira.getByTestId("reported-item").filter({ hasText: words });
  await expect(card.getByTestId("reported-item-escalated")).toBeVisible();
  await expect(card).toContainText("a visitor");
  await expect(card).toContainText(`Comment on “${title}”`);
  // Escalated already, so no second Escalate; and only an admin may dismiss it.
  await expect(card.getByTestId("report-escalate")).toHaveCount(0);
  await expect(card.getByTestId("report-dismiss")).toHaveCount(0);
  await card.getByTestId("report-hide").click();
  await expect(mira.getByTestId("reports-status")).toHaveText(
    "Hidden. Its reports are closed.",
  );
  await expect(mira.getByTestId("reported-item").filter({ hasText: words })).toHaveCount(
    0,
  );

  await visitor.goto(postUrl);
  await expect(visitor.getByText(words)).toHaveCount(0);
  await deletePost(theo, title);
});

test("the report form needs a reason and names a missing item as a 404", async ({
  page,
}) => {
  await page.goto("/@theo/hello-from-the-porch");
  await page.getByTestId("post-report").click();
  // The select is required: the browser keeps the form from sending with no reason.
  await page.getByRole("button", { name: "Send report" }).click();
  expect(
    await page
      .getByTestId("report-reason")
      .evaluate((el) => (el as HTMLSelectElement).validity.valueMissing),
  ).toBe(true);
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/@theo\/hello-from-the-porch$/);

  const missing = await page.goto(
    "/report?post=00000000-0000-4000-8000-00000000dead&from=/",
  );
  expect(missing?.status()).toBe(404);
  expect((await page.goto("/report?post=not-an-id"))?.status()).toBe(404);
});

test("a plain member cannot open the Reports page", async ({ page }) => {
  await devSignIn(page, JUNE);
  expect((await page.goto("/mod/reports"))?.status()).toBe(404);
});
