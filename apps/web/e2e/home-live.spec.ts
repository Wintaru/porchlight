import { expect, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, fillBodyMarkdown, THEO } from "./helpers";

// D33: the home page shows a new post without a reload, from a poll a CDN can cache.

test("the poll answers one cacheable time and sets no cookie", async ({ request }) => {
  const response = await request.get("/api/latest-post");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe(
    "public, s-maxage=30, stale-while-revalidate=30",
  );
  expect(response.headers()["set-cookie"]).toBeUndefined();
  const body = (await response.json()) as { publishedAt: unknown };
  expect(typeof body.publishedAt).toBe("string");
});

test("a post published while a visitor reads the home page appears there", async ({
  page,
  browser,
}) => {
  const title = `Live ${Date.now().toString(36)}`;
  await page.clock.install();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Latest on the porch" })).toBeVisible();
  // A full reload would lose this.
  await page.evaluate(() => {
    (window as unknown as { stayed: boolean }).stayed = true;
  });

  const theo = await browser.newPage();
  await devSignIn(theo, THEO);
  await theo.goto("/write");
  await theo.getByLabel("Title").fill(title);
  await fillBodyMarkdown(theo, "Fresh off the porch.");
  await theo.getByRole("button", { name: "Publish" }).click();
  await expect(theo).toHaveURL(/\/@theo\/live-/);

  try {
    await expect(page.getByText(title)).toHaveCount(0);
    await page.clock.fastForward(61_000);
    await expect(page.getByText(title)).toBeVisible();
    expect(
      await page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed),
    ).toBe(true);
  } finally {
    await theo.getByTestId("post-edit").click();
    await expect(theo).toHaveURL(/\/write\/[0-9a-f-]+$/);
    await deleteCurrentPost(theo);
    await theo.close();
  }
});
