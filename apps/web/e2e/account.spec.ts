import JSZip from "jszip";
import { expect, type Page, test } from "@playwright/test";

import {
  deleteCurrentPost,
  devSignIn,
  fillBodyMarkdown,
  IVY,
  type SeedMember,
  THEO,
} from "./helpers";

// The issue #14 acceptance test: a member with a post of her own, a comment on someone
// else's post that a reply is later added to, and a second comment with no reply —
// exports everything, then erases the account and checks every edge SPEC.md §10 names:
// the post and the childless comment are gone for good, the replied-to comment becomes
// a tombstone with the reply still readable, and both `/@handle` and the post page
// answer 410. Ivy is seeded empty (supabase/seed.sql) so nothing but this test's own
// content is at stake. Unlike every other spec here, this one cannot restore its own
// fixture when it is done: erasure deletes Ivy's auth user for real, so a second local
// run without a `supabase db reset` between them finds her already erased and fails at
// her own sign-in. CI resets the seed before every run; a local rerun needs the same.

async function publishPost(
  page: Page,
  member: SeedMember,
  title: string,
): Promise<{ readonly url: string; readonly id: string }> {
  await devSignIn(page, member);
  await page.goto("/write");
  await page.getByLabel("Title").fill(title);
  await fillBodyMarkdown(page, "Written for the export and erasure test.");
  await page.getByLabel(/^Public/).check();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(new RegExp(`/@${member.handle}/`));
  const id = await page
    .getByTestId("comment-form")
    .locator('input[name="postId"]')
    .inputValue();
  return { url: new URL(page.url()).pathname, id };
}

async function postComment(page: Page, body: string): Promise<void> {
  await page.getByTestId("comment-form").getByLabel("Your comment").fill(body);
  await page.getByTestId("comment-form").getByRole("button", { name: "Comment" }).click();
  await expect(page.getByTestId("comment-notice")).toHaveText("Posted.");
  await expect(page.getByTestId("comment").filter({ hasText: body })).toBeVisible();
}

test("a member exports her data, then erases her account (#14)", async ({
  page,
  browser,
}) => {
  const stamp = Date.now().toString(36);
  const other = await browser.newPage();

  // Theo publishes a post; Ivy leaves two comments on it, one that will stay childless
  // and one Theo replies to. Cleaning this up is in `finally`: Ivy's erasure is the
  // point of the test and needs no cleanup, but a failed assertion below must not skip
  // deleting Theo's post and leave it behind in the shared seed database.
  const theirPost = await publishPost(other, THEO, `For Ivy to comment on ${stamp}`);
  const theirPostUrl = theirPost.url;
  try {
    await devSignIn(page, IVY);
    await page.goto(theirPostUrl);
    await postComment(page, `No reply for this one ${stamp}`);
    await postComment(page, `Theo will reply to this ${stamp}`);

    await other.goto(theirPostUrl);
    const replyMagnet = other
      .getByTestId("comment")
      .filter({ hasText: `Theo will reply to this ${stamp}` });
    await replyMagnet.locator("summary", { hasText: "Reply" }).click();
    await replyMagnet
      .getByTestId("reply-form")
      .getByLabel("Your reply")
      .fill(`Ivy's own words, from Theo ${stamp}`);
    await replyMagnet
      .getByTestId("reply-form")
      .getByRole("button", { name: "Reply" })
      .click();
    await expect(other.getByTestId("comment-notice")).toHaveText("Posted.");

    // Ivy also has a post of her own.
    const ivyPost = await publishPost(page, IVY, `A post by Ivy ${stamp}`);
    const ivyPostUrl = ivyPost.url;
    const ivySlug = ivyPostUrl.split("/").pop();
    if (ivySlug === undefined) {
      throw new Error(`could not read a slug from ${ivyPostUrl}`);
    }

    // Export first: the zip has her post as markdown, and a JSON bundle naming it and
    // both comments.
    const exported = await page.request.get("/settings/export");
    expect(exported.headers()["content-type"]).toBe("application/zip");
    expect(exported.headers()["content-disposition"]).toContain("attachment");
    const zip = await JSZip.loadAsync(await exported.body());
    const dataFile = zip.file("data.json");
    const postFile = zip.file(`posts/${ivySlug}.md`);
    if (dataFile === null || postFile === null) {
      throw new Error("expected data.json and Ivy's post markdown in the export");
    }
    const bundle = JSON.parse(await dataFile.async("string")) as {
      posts: readonly { slug: string }[];
      comments: readonly { id: string }[];
    };
    expect(bundle.posts.map((post) => post.slug)).toContain(ivySlug);
    expect(bundle.comments).toHaveLength(2);
    expect(await postFile.async("string")).toContain(
      "Written for the export and erasure test.",
    );

    // Erase, with the confirmation step.
    await page.goto("/settings/erase");
    await page.getByTestId("erase-confirm-checkbox").check();
    await page.getByTestId("erase-confirm-submit").click();
    await expect(page).toHaveURL(/\/\?erased=1$/);
    await expect(page.getByTestId("account-erased")).toBeVisible();

    // The author page and her own post both answer 410 Gone.
    const authorGone = await page.goto("/@ivy");
    expect(authorGone?.status()).toBe(410);
    const postGone = await page.goto(ivyPostUrl);
    expect(postGone?.status()).toBe(410);

    // On Theo's post: the childless comment is gone for good, the replied-to comment is
    // a tombstone, and Theo's reply under it still reads.
    await other.goto(theirPostUrl);
    await expect(other.getByText(`No reply for this one ${stamp}`)).toHaveCount(0);
    await expect(other.getByTestId("comment-tombstone")).toContainText("[deleted]");
    await expect(other.getByText(`Ivy's own words, from Theo ${stamp}`)).toBeVisible();

    // The erased auth user cannot sign back in.
    await page.goto("/auth/dev-sign-in");
    await page.getByLabel("Email").fill(IVY.email);
    await page.getByLabel("Password").fill("porchlight");
    await page.getByRole("button", { name: "Sign in as this member" }).click();
    await expect(page.getByTestId("session-handle")).toHaveCount(0);
  } finally {
    // Ivy's post and comments were erased for real; Theo's post is still his to clean up.
    await other.goto(`/write/${theirPost.id}`);
    await deleteCurrentPost(other);
    await other.close();
  }
});
