import { expect, test } from "@playwright/test";

// SPEC.md §9, D18: OpenGraph, Twitter and JSON-LD `Article` on a post, its generated
// preview image, and the share button. Runs against the seeded local stack
// (docs/setup/supabase.md); nothing here writes data, so there is no cleanup step.

test("a post carries OpenGraph, Twitter and JSON-LD Article tags, and its own preview image", async ({
  page,
  request,
}) => {
  await page.goto("/@theo/hello-from-the-porch");

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/@theo\/hello-from-the-porch$/,
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
    "content",
    "article",
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Hello from the porch",
  );
  const ogImage = page.locator('meta[property="og:image"]');
  await expect(ogImage).toHaveCount(1);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );

  const imageUrl = await ogImage.getAttribute("content");
  expect(imageUrl).not.toBeNull();
  const imageResponse = await request.get(imageUrl ?? "");
  expect(imageResponse.status()).toBe(200);
  expect(imageResponse.headers()["content-type"]).toBe("image/png");

  const jsonLd = page.locator('script[type="application/ld+json"]');
  await expect(jsonLd).toHaveCount(1);
  const parsed = JSON.parse((await jsonLd.textContent()) ?? "{}") as Record<
    string,
    unknown
  >;
  expect(parsed).toMatchObject({
    "@type": "Article",
    headline: "Hello from the porch",
  });
  // This post's seeded cover already carries a published_path (supabase/seed.sql), so
  // it is its own image, not the branded fallback card.
  expect(parsed.image).toContain("porch-at-dusk.jpg");
});

test("the share button copies the post's link", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-write", "clipboard-read"]);
  await page.goto("/@theo/hello-from-the-porch");
  await page.getByTestId("share-button").click();
  await expect(page.getByTestId("share-status")).toHaveText("Link copied.");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("/@theo/hello-from-the-porch");
});
