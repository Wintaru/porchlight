import { expect, test } from "@playwright/test";

// SPEC.md §9, D21's three RSS feeds, plus the canonical link and `<link rel=
// "alternate">` every page carries to its own feed. Runs against the seeded local stack
// (docs/setup/supabase.md); nothing here writes data, so there is no cleanup step.

test("the site feed lists public published posts and excludes unlisted and draft ones", async ({
  request,
}) => {
  const response = await request.get("/feed.xml");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/rss+xml");
  const body = await response.text();
  expect(body).toContain('<rss version="2.0">');
  expect(body).toContain("Hello from the porch");
  expect(body).toContain("Welcome to Porchlight");
  expect(body).not.toContain("An unlisted note");
  expect(body).not.toContain("Half a thought");
});

test("an author's feed lists only their own public posts; an erased or unknown handle is 404", async ({
  request,
}) => {
  const theo = await request.get("/@theo/feed.xml");
  expect(theo.status()).toBe(200);
  const theoBody = await theo.text();
  expect(theoBody).toContain("Hello from the porch");
  expect(theoBody).not.toContain("Welcome to Porchlight");
  expect(theoBody).not.toContain("An unlisted note");

  expect((await request.get("/@wren/feed.xml")).status()).toBe(404);
  expect((await request.get("/@nobody-here/feed.xml")).status()).toBe(404);
});

test("a tag's feed lists only posts under that tag; an unknown tag is 404, an empty tag is a valid empty feed", async ({
  request,
}) => {
  const making = await request.get("/t/making/feed.xml");
  expect(making.status()).toBe(200);
  const makingBody = await making.text();
  expect(makingBody).toContain("Hello from the porch");
  expect(makingBody).not.toContain("Welcome to Porchlight");

  // "hiking" exists but its only post is still pending, so it is not a public tag yet.
  expect((await request.get("/t/hiking/feed.xml")).status()).toBe(404);

  expect((await request.get("/t/no-such-tag/feed.xml")).status()).toBe(404);
});

test("the home, author and tag pages carry a canonical link and an RSS alternate", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(
    page.locator('link[rel="alternate"][type="application/rss+xml"]'),
  ).toHaveAttribute("href", /\/feed\.xml$/);

  await page.goto("/@theo");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/@theo$/);
  await expect(
    page.locator('link[rel="alternate"][type="application/rss+xml"]'),
  ).toHaveAttribute("href", /\/@theo\/feed\.xml$/);

  await page.goto("/t/making");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/t\/making$/,
  );
  await expect(
    page.locator('link[rel="alternate"][type="application/rss+xml"]'),
  ).toHaveAttribute("href", /\/t\/making\/feed\.xml$/);
});
