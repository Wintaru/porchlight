import { type Page, expect, test } from "@playwright/test";

import { authUserId } from "./auth-admin";
import { THEO, devSignIn } from "./helpers";
import { type TestMember, createMember, removeMember } from "./members";
import { rest } from "./service-rest";

// Every list pages by a cursor: "Older posts" starts after the last post shown, and
// "Newest posts" goes back to the first page. A made member writes 25 posts under a tag
// of its own, the newest on the site, so each list's first page is 20 of them and the
// second page starts with the other 5. Posts 20 and 21 share a publish time: the id
// breaks the tie, so neither is shown twice or skipped.

test.describe.configure({ mode: "serial" });

const POST_COUNT = 25;
const run = Date.now().toString(36);
const titleOf = (n: number): string => `Pager ${run} ${String(n).padStart(2, "0")}`;
const TITLES = Array.from({ length: POST_COUNT }, (_, i) => titleOf(i + 1));
const TAG_SLUG = `pager-${run}`;
const HANDLE = `pager_${run}`;

let member: TestMember | undefined;
let tagId: string | undefined;

test.beforeAll(async () => {
  const made = await createMember(HANDLE);
  member = made;
  const newest = Date.now() + 60_000;
  const posts = (await (
    await rest("posts", {
      method: "POST",
      prefer: "return=representation",
      body: JSON.stringify(
        TITLES.map((title, i) => ({
          author_id: made.id,
          slug: `pager-${run}-${String(i + 1)}`,
          title,
          status: "published",
          visibility: "public",
          // Posts 20 and 21 (indexes 19 and 20) share one time. Microseconds, so a
          // cursor rounded to a JS Date's milliseconds would fail here.
          published_at: new Date(
            newest - Math.min(i, 19) * 1000 - Math.max(i - 20, 0) * 1000,
          )
            .toISOString()
            .replace("Z", "456Z"),
        })),
      ),
    })
  ).json()) as readonly { readonly id: string }[];
  const [tag] = (await (
    await rest("tags", {
      method: "POST",
      prefer: "return=representation",
      body: JSON.stringify({ slug: TAG_SLUG, name: TAG_SLUG }),
    })
  ).json()) as readonly { readonly id: string }[];
  if (tag === undefined) {
    throw new Error("no tag made");
  }
  tagId = tag.id;
  await rest("post_tags", {
    method: "POST",
    body: JSON.stringify(posts.map((post) => ({ post_id: post.id, tag_id: tag.id }))),
  });
});

test.afterAll(async () => {
  if (member !== undefined) {
    await removeMember(member);
  }
  if (tagId !== undefined) {
    await rest(`tags?id=eq.${tagId}`, { method: "DELETE" });
  }
});

// Pages through one list: the first page holds 20 of the posts, newest first, and
// "Older posts" holds the other 5, so each post shows exactly once. Posts 20 and 21 share
// a time, so either may close the first page. "Newest posts" goes back to the first page.
async function pagesThrough(page: Page, path: string): Promise<void> {
  const list = page.getByTestId("post-list");
  const pager = page.getByRole("navigation", { name: "More posts" });
  const shownTitles = async (): Promise<readonly string[]> =>
    (await list.getByRole("heading").allTextContents()).filter((title) =>
      title.startsWith(`Pager ${run} `),
    );

  await page.goto(path);
  await expect(list.getByText(titleOf(1), { exact: true })).toBeVisible();
  const first = await shownTitles();
  expect(first).toHaveLength(20);
  expect(first.slice(0, 19)).toEqual(TITLES.slice(0, 19));
  await expect(pager.getByRole("link", { name: "Newest posts" })).toHaveCount(0);

  await pager.getByRole("link", { name: "Older posts" }).click();
  await expect(page).toHaveURL(/[?&]before=/);
  await expect(list.getByText(titleOf(POST_COUNT), { exact: true })).toBeVisible();
  const second = await shownTitles();
  expect(second).toHaveLength(POST_COUNT - 20);
  expect(new Set([...first, ...second]).size).toBe(POST_COUNT);

  await pager.getByRole("link", { name: "Newest posts" }).click();
  await expect(page).not.toHaveURL(/before=/);
  await expect(list.getByText(titleOf(1), { exact: true })).toBeVisible();
}

test("a visitor pages through the home feed", async ({ page }) => {
  await pagesThrough(page, "/");
});

test("a visitor pages through an author's posts, and the last page has no Older link", async ({
  page,
}) => {
  await pagesThrough(page, `/@${HANDLE}`);
  await page.getByRole("link", { name: "Older posts" }).click();
  await expect(page.getByRole("link", { name: "Older posts" })).toHaveCount(0);
});

test("a visitor pages through a tag", async ({ page }) => {
  await pagesThrough(page, `/t/${TAG_SLUG}`);
});

test("a member pages through the home feed, a tag and their Following feed", async ({
  page,
}) => {
  const theoId = await authUserId(THEO.email);
  await rest("follows", {
    method: "POST",
    body: JSON.stringify({ follower_id: theoId, tag_id: tagId }),
  });
  try {
    await devSignIn(page, THEO);
    await pagesThrough(page, "/");
    await pagesThrough(page, `/t/${TAG_SLUG}`);
    await pagesThrough(page, "/?feed=following");
    await expect(page.getByRole("link", { name: "Following" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  } finally {
    await rest(`follows?follower_id=eq.${theoId ?? ""}&tag_id=eq.${tagId ?? ""}`, {
      method: "DELETE",
    });
  }
});

test("a cursor that is not one in shape shows the first page", async ({ page }) => {
  await page.goto(`/t/${TAG_SLUG}?before=nonsense`);
  await expect(page.getByText(titleOf(1), { exact: true })).toBeVisible();
});
