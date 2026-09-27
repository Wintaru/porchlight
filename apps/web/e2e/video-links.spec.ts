import { expect, type Page, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, fillBodyMarkdown, THEO } from "./helpers";

// Issue #21: a YouTube link alone on its line becomes a card that asks YouTube for
// nothing until it is pressed; a link inside a sentence stays text. The post the test
// writes it deletes.

// Opens the post in the editor, where the delete link is, and deletes it.
async function deletePost(page: Page, title: string): Promise<void> {
  await page.goto("/write");
  await page.getByTestId("my-posts").getByRole("link", { name: title }).click();
  await deleteCurrentPost(page);
}

test("a YouTube link alone on its line is a card that loads YouTube only when pressed", async ({
  page,
}) => {
  const stamp = Date.now().toString(36);
  const title = `Porch video ${stamp}`;
  const youtube: string[] = [];
  // Nothing reaches the real service from a test: count the requests, answer none.
  await page.route(/youtube(-nocookie)?\.com|ytimg\.com|youtu\.be/, async (route) => {
    youtube.push(route.request().url());
    await route.fulfill({ status: 200, contentType: "text/html", body: "<p>player</p>" });
  });
  await devSignIn(page, THEO);
  await page.goto("/write");
  await page.getByLabel("Title").fill(title);
  await fillBodyMarkdown(
    page,
    [
      "Watch this:",
      "",
      "https://youtu.be/dQw4w9WgXcQ",
      "",
      "Or read about https://youtu.be/dQw4w9WgXcQ in a sentence.",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(new RegExp(`/@theo/porch-video-${stamp}$`));

  const body = page.getByTestId("post-body");
  const card = body.getByRole("link", { name: "Play video on YouTube" });
  await expect(card).toHaveAttribute(
    "href",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  );
  // The link inside a sentence stays text.
  await expect(body.getByText(/in a sentence/)).toBeVisible();
  await expect(body.locator("[data-embed]")).toHaveCount(1);
  expect(youtube).toEqual([]);

  await card.click();
  const frame = body.locator("iframe");
  await expect(frame).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
  );
  await expect.poll(() => youtube.length).toBeGreaterThan(0);
  expect(
    youtube.every((url) => url.startsWith("https://www.youtube-nocookie.com/")),
  ).toBe(true);
  await expect(page).toHaveURL(new RegExp(`/@theo/porch-video-${stamp}$`));

  await deletePost(page, title);
});
