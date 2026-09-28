import { type Browser, expect, type Page, test } from "@playwright/test";

import { deleteSubscribers, runEmailSweep, setPostAnnounced } from "./email-admin";
import {
  deleteCurrentPost,
  devSignIn,
  fillBodyMarkdown,
  JUNE,
  LAMPLIGHTER,
  MIRA,
  type SeedMember,
  THEO,
} from "./helpers";
import { emailTo } from "./mailbox";
import { rest } from "./service-rest";

// Issue #101 (D27): a private post is a journal entry only its author sees. It shows in
// the author's own feed, profile and post page with the "Only you" chip, and nowhere
// else, for anyone. A probation member's private post skips the queue; turning it
// public sends it there. A trusted member's post turned public tells followers once.
// Every test deletes what it made.

const THEO_ID = "00000000-0000-4000-8000-000000000003";
const JUNE_ID = "00000000-0000-4000-8000-000000000004";
const THEO_PUBLIC_POST = "00000000-0000-4000-8000-0000000000b2";

interface Written {
  readonly id: string;
  readonly path: string;
}

// Writes and publishes a private post through the editor, and answers where it lives.
async function publishPrivate(
  page: Page,
  title: string,
  body: string,
  tag?: string,
): Promise<Written> {
  await page.goto("/write");
  await page.getByLabel("Title").fill(title);
  await fillBodyMarkdown(page, body);
  if (tag !== undefined) {
    await page.getByLabel("Add a tag").fill(tag);
    await page.getByLabel("Add a tag").press("Enter");
  }
  await page.getByLabel("Private · only you, like a journal").check();
  await page.getByRole("button", { name: "Publish" }).click();
  // Private goes up at once, whoever wrote it: Publish lands on the post page.
  await expect(page).toHaveURL(/\/@[a-z0-9_]+\/journal-/);
  const path = new URL(page.url()).pathname;
  const href = await page.getByTestId("post-edit").getAttribute("href");
  const id = href?.split("/").pop();
  if (id === undefined) {
    throw new Error("no edit link on the post page");
  }
  return { id, path };
}

// A fresh browser for one reader: a visitor when `member` is undefined.
async function readerPage(browser: Browser, member?: SeedMember): Promise<Page> {
  const page = await browser.newPage();
  if (member !== undefined) {
    await devSignIn(page, member);
  }
  return page;
}

async function noticeCount(postId: string, kind: string): Promise<number> {
  const response = await rest(
    `notifications?select=id&post_id=eq.${postId}&kind=eq.${encodeURIComponent(kind)}`,
    { method: "GET" },
  );
  return ((await response.json()) as readonly unknown[]).length;
}

async function setVisibilityInEditor(
  page: Page,
  postId: string,
  label: string,
): Promise<void> {
  await page.goto(`/write/${postId}`);
  await page.getByLabel(label).check();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("form-status")).toBeVisible();
}

test("a private post shows only to its author, with the chip, and on no other surface", async ({
  page,
  browser,
  baseURL,
  request,
}) => {
  const stamp = Date.now().toString(36);
  const word = `quilljournal${stamp}`;
  const title = `Journal ${stamp}`;
  const reader = `private-reader-${stamp}@example.test`;
  await devSignIn(page, THEO);
  const post = await publishPrivate(page, title, `A note for me, ${word}.`, "making");

  try {
    // The author: the post page with the chip, and no comments, reactions or Share.
    await expect(page.getByTestId("private-chip")).toBeVisible();
    await expect(page.getByTestId("comment-count")).toHaveCount(0);
    await expect(page.getByTestId("post-reactions")).toHaveCount(0);
    await expect(page.getByTestId("share-button")).toHaveCount(0);
    // Their home feed and their profile, each with the chip.
    for (const where of ["/", "/@theo"]) {
      await page.goto(where);
      const card = page.getByTestId("post-card").filter({ hasText: title });
      await expect(card).toHaveCount(1);
      await expect(card.getByTestId("private-chip")).toBeVisible();
    }
    // A tag's feed stays public posts only, for the author too.
    await page.goto("/t/making");
    await expect(page.getByTestId("post-card").filter({ hasText: title })).toHaveCount(0);

    // Everyone else: a visitor, another member, a moderator, an admin.
    for (const member of [undefined, JUNE, MIRA, LAMPLIGHTER]) {
      const other = await readerPage(browser, member);
      const response = await other.goto(post.path);
      expect(response?.status()).toBe(404);
      for (const where of ["/", "/@theo", "/t/making", `/search?q=${word}`]) {
        await other.goto(where);
        await expect(other.getByText(title)).toHaveCount(0);
      }
      if (member === MIRA || member === LAMPLIGHTER) {
        await other.goto("/mod/queue");
        await expect(other.getByText(title)).toHaveCount(0);
      }
      await other.close();
    }

    // The feeds and the sitemap a crawler or a reader app fetches.
    for (const feed of [
      "/feed.xml",
      "/@theo/feed.xml",
      "/t/making/feed.xml",
      "/sitemap.xml",
    ]) {
      const body = await (await request.get(feed)).text();
      expect(body).not.toContain(title);
      expect(body).not.toContain(post.path);
    }

    // No notice went to anyone: no follower notice, no queue notice.
    expect(await noticeCount(post.id, "post.published")).toBe(0);
    expect(await noticeCount(post.id, "queue.pending")).toBe(0);

    // A reader email subscriber of Theo's: even with the post marked announced, the
    // sweep mails his public post and never the private one.
    await rest("subscribers", {
      method: "POST",
      body: JSON.stringify({
        email: reader,
        author_id: THEO_ID,
        digest: "hourly",
        confirmed_at: new Date().toISOString(),
        cursor: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      }),
    });
    await setPostAnnounced(post.id, true);
    await setPostAnnounced(THEO_PUBLIC_POST, true);
    const beforeSweep = new Date(Date.now() - 1000);
    await runEmailSweep(baseURL ?? "");
    const digest = await emailTo(reader, beforeSweep, "New from @theo");
    expect(digest.text).toContain("Hello from the porch");
    expect(digest.text).not.toContain(title);
    expect(digest.text).not.toContain(post.path);
  } finally {
    await deleteSubscribers(reader);
    await setPostAnnounced(THEO_PUBLIC_POST, false);
    await page.goto(`/write/${post.id}`);
    await deleteCurrentPost(page);
  }
});

test("a probation member's private post skips the queue, and turning it public sends it there", async ({
  page,
  browser,
}) => {
  const title = `Journal ${Date.now().toString(36)}`;
  await devSignIn(page, JUNE);
  const post = await publishPrivate(page, title, "Only for me, for now.");
  const mira = await readerPage(browser, MIRA);

  try {
    await expect(page.getByTestId("private-chip")).toBeVisible();
    await expect(page.getByTestId("post-status-note")).toHaveCount(0);
    await mira.goto("/mod/queue");
    await expect(mira.getByTestId("queue-item").filter({ hasText: title })).toHaveCount(
      0,
    );

    await setVisibilityInEditor(page, post.id, "Public · in the feed and in search");
    await expect(page.getByTestId("form-status")).toContainText("sent to the queue");
    await expect(page.getByTestId("post-status")).toContainText(/waiting/i);
    await mira.goto("/mod/queue");
    await expect(mira.getByTestId("queue-item").filter({ hasText: title })).toHaveCount(
      1,
    );
  } finally {
    await mira.close();
    await page.goto(`/write/${post.id}`);
    await deleteCurrentPost(page);
  }
});

test("a trusted member's post turned public tells followers once", async ({ page }) => {
  const title = `Journal ${Date.now().toString(36)}`;
  // June follows Theo for this test, unless she already did: the shared database may
  // hold a follow of hers, and the cleanup must not take that one away.
  const follow = `follows?follower_id=eq.${JUNE_ID}&author_id=eq.${THEO_ID}`;
  const existing = (await (
    await rest(`${follow}&select=follower_id`, { method: "GET" })
  ).json()) as readonly unknown[];
  if (existing.length === 0) {
    await rest("follows", {
      method: "POST",
      body: JSON.stringify({ follower_id: JUNE_ID, author_id: THEO_ID }),
    });
  }
  // Inside the `try`, so a failed sign-in or publish still takes the follow back.
  let post: Written | undefined;
  try {
    await devSignIn(page, THEO);
    post = await publishPrivate(page, title, "Ready to share now.");
    expect(await noticeCount(post.id, "post.published")).toBe(0);
    await setVisibilityInEditor(page, post.id, "Public · in the feed and in search");
    expect(await noticeCount(post.id, "post.published")).toBe(1);

    // Back to private, out again by link, public again: still one notice.
    await setVisibilityInEditor(page, post.id, "Private · only you, like a journal");
    await setVisibilityInEditor(page, post.id, "Unlisted · only people with the link");
    await setVisibilityInEditor(page, post.id, "Public · in the feed and in search");
    expect(await noticeCount(post.id, "post.published")).toBe(1);
  } finally {
    if (existing.length === 0) {
      await rest(follow, { method: "DELETE" });
    }
    if (post !== undefined) {
      await page.goto(`/write/${post.id}`);
      await deleteCurrentPost(page);
    }
  }
});
