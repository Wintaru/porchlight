import { expect, type Page, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, fillBodyMarkdown, JUNE, THEO } from "./helpers";

// The issue #5 acceptance test: a trusted member publishes and the post renders at
// /@handle/slug with sanitized HTML; a probation member's post lands in pending; the
// feed, author and tag pages list what they should; an erased author is 410. Runs
// against the seeded local stack (docs/setup/supabase.md). Every post a test creates,
// it deletes at the end, so the seed is the same for the next run. The editor tests
// (#6) live in editor.spec.ts; the helpers here drive it through its markdown mode.
async function fillPost(
  page: Page,
  fields: {
    title: string;
    body: string;
    summary?: string;
    tags?: string;
    unlisted?: boolean;
  },
): Promise<void> {
  await page.getByLabel("Title").fill(fields.title);
  await fillBodyMarkdown(page, fields.body);
  await page.getByLabel("Summary for the preview card").fill(fields.summary ?? "");
  for (const tag of (fields.tags ?? "").split(",")) {
    if (tag.trim() !== "") {
      await page.getByLabel("Add a tag").fill(tag.trim());
      await page.getByLabel("Add a tag").press("Enter");
    }
  }
  await page.getByLabel(fields.unlisted ? /^Unlisted/ : /^Public/).check();
}

test("the seeded feed lists public published posts newest first and no unlisted one", async ({
  page,
}) => {
  await page.goto("/");
  const cards = page.getByTestId("post-card");
  await expect(cards.first().getByRole("heading")).toHaveText("Hello from the porch");
  await expect(cards.nth(1).getByRole("heading")).toHaveText("Welcome to Porchlight");
  await expect(page.getByText("An unlisted note")).toHaveCount(0);
  await expect(page.getByText("Half a thought")).toHaveCount(0);
});

test("an unlisted post is readable by its link and carries noindex", async ({ page }) => {
  const response = await page.goto("/@theo/an-unlisted-note");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("An unlisted note");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("author and tag pages list only public published posts", async ({ page }) => {
  await page.goto("/@theo");
  await expect(page.getByTestId("author-handle")).toHaveText("@theo");
  await expect(page.getByTestId("post-card")).toHaveCount(1);
  await expect(page.getByText("Hello from the porch")).toBeVisible();

  await page.goto("/t/making");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Making");
  await expect(page.getByTestId("post-card")).toHaveCount(1);

  await page.goto("/t/hiking");
  await expect(page.getByTestId("post-list-empty")).toBeVisible();
});

test("an erased author is 410 Gone; an unknown handle and a bare word are 404", async ({
  page,
}) => {
  const gone = await page.goto("/@wren");
  expect(gone?.status()).toBe(410);
  const gonePost = await page.goto("/@wren/anything");
  expect(gonePost?.status()).toBe(410);
  const unknown = await page.goto("/@nobody-here");
  expect(unknown?.status()).toBe(404);
  const bare = await page.goto("/theo");
  expect(bare?.status()).toBe(404);
  // A draft is not a public page, even by its exact URL.
  const draft = await page.goto("/@theo/half-a-thought");
  expect(draft?.status()).toBe(404);
});

test("a visitor has no Write link and is sent to sign in from /write", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Write" })).toHaveCount(0);
  await page.goto("/write");
  await expect(page).toHaveURL(/\/auth\/dev-sign-in\?next=%2Fwrite$/);
});

test("a trusted member publishes and the post renders with sanitized HTML", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  await page.getByRole("link", { name: "Write" }).click();
  await expect(page).toHaveURL(/\/write$/);

  const stamp = Date.now().toString(36);
  const title = `Cedar planter ${stamp}`;
  await fillPost(page, {
    title,
    body: "Three **weekends**.\n\n<script>alert(1)</script>\n\n[plan](javascript:alert(1)) and [safe](https://example.com/plan)",
    summary: "Cedar was the right call.",
    // Seeded tag names: a tag outlives the posts under it, so a new one would change
    // the seed for the packages/db tests.
    tags: "Making, hiking",
  });
  await page.getByRole("button", { name: "Publish" }).click();

  await expect(page).toHaveURL(new RegExp(`/@theo/cedar-planter-${stamp}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  const body = page.getByTestId("post-body");
  await expect(body.locator("strong")).toHaveText("weekends");
  await expect(body.locator("script")).toHaveCount(0);
  await expect(body.getByRole("link", { name: "safe" })).toHaveAttribute(
    "href",
    "https://example.com/plan",
  );
  await expect(body.locator("a", { hasText: "plan" }).first()).not.toHaveAttribute(
    "href",
    /javascript/,
  );
  await expect(page.getByTestId("post-status-note")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Making" })).toBeVisible();

  // It is on the feed, the author page and the tag page.
  await page.goto("/");
  await expect(page.getByTestId("post-card").first().getByRole("heading")).toHaveText(
    title,
  );
  await page.goto("/t/hiking");
  await expect(page.getByText(title)).toBeVisible();

  // Unpublish takes it off the feed; delete cleans up.
  await page.goto("/write");
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByTestId("post-status")).toHaveText("Published");
  await page.getByRole("button", { name: "Unpublish" }).click();
  await expect(page.getByTestId("form-status")).toHaveText(
    "Taken down. It is a draft again.",
  );
  await expect(page.getByTestId("post-status")).toHaveText("Draft");
  await deleteCurrentPost(page);
  await page.goto("/");
  await expect(page.getByText(title)).toHaveCount(0);
});

test("a probation member's post lands in pending and shows only to them", async ({
  page,
  browser,
}) => {
  await devSignIn(page, JUNE);
  await page.goto("/write");
  const stamp = Date.now().toString(36);
  const title = `First trail ${stamp}`;
  await fillPost(page, { title, body: "Eleven miles.", tags: "hiking" });
  await page.getByRole("button", { name: "Publish" }).click();

  await expect(page).toHaveURL(/\/write\/[0-9a-f-]+\?saved=pending$/);
  await expect(page.getByTestId("post-status")).toHaveText("Waiting for approval");
  await expect(page.getByTestId("form-status")).toHaveText(/sent to the queue/);

  // June sees her own pending page; a visitor does not.
  await page.getByRole("link", { name: "View" }).click();
  await expect(page.getByTestId("post-status-note")).toHaveText(/Waiting for approval/);
  const visitor = await browser.newPage();
  const hidden = await visitor.goto(`/@june/first-trail-${stamp}`);
  expect(hidden?.status()).toBe(404);
  await visitor.goto("/");
  await expect(visitor.getByText(title)).toHaveCount(0);
  await visitor.close();

  await page.goBack();
  await deleteCurrentPost(page);
});

test("the editor refuses a blank title and saves a draft that only its author sees", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  await page.goto("/write");
  await fillBodyMarkdown(page, "no title");
  await page.getByLabel("Title").evaluate((input: HTMLInputElement) => {
    input.removeAttribute("required");
  });
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByTestId("form-error")).toHaveText("A post needs a title.");

  const stamp = Date.now().toString(36);
  const title = `Half done ${stamp}`;
  await fillPost(page, { title, body: "Not yet." });
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]+\?saved=draft$/);
  await expect(page.getByTestId("post-status")).toHaveText("Draft");

  await page.getByLabel("Title").fill(`${title} edited`);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByTestId("form-status")).toHaveText("Saved.");
  await expect(page.getByLabel("Title")).toHaveValue(`${title} edited`);
  await deleteCurrentPost(page);
});
