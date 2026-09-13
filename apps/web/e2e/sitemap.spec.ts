import { expect, test } from "@playwright/test";

// SPEC.md §9: sitemap.xml and robots.txt. Runs against the seeded local stack
// (docs/setup/supabase.md); nothing here writes data, so there is no cleanup step.

test("robots.txt allows everything and points at the sitemap", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain("Allow: /");
  expect(body).toMatch(/Sitemap: .*\/sitemap\.xml/);
});

test("the sitemap lists public published posts, their authors and tags, and never an unlisted or draft one", async ({
  request,
}) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain("/@theo/hello-from-the-porch");
  expect(body).toContain("/@lamplighter/welcome-to-porchlight");
  expect(body).toContain("/@theo</loc>");
  expect(body).toContain("/@lamplighter</loc>");
  expect(body).toContain("/t/making</loc>");
  expect(body).toContain("/t/porch-talk</loc>");
  expect(body).not.toContain("an-unlisted-note");
  expect(body).not.toContain("half-a-thought");
});
