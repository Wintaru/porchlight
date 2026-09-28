import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import {
  deleteCurrentPost,
  devSignIn,
  fillBodyMarkdown,
  insertUpload,
  MIRA,
  THEO,
} from "./helpers";
import { rest } from "./service-rest";

// Issue #21: an iPhone photo (HEIC) goes up and is published as AVIF; a video is
// prepared in the browser (its metadata dropped, its movie box moved first), checked,
// scanned and plays in the post. Every post a test writes it deletes, and its uploads go
// with it (#80); an upload in no post is removed on the page that made it.

const FIXTURES = join(import.meta.dirname, "fixtures");
// porch-photo.jpg saved as HEIC by macOS.
const HEIC = readFileSync(join(FIXTURES, "porch-photo.heic"));
// Two seconds of H.264 and AAC straight from an encoder: a title and a location in its
// user data box (`udta`), and its movie box after the media.
const CLIP = readFileSync(join(FIXTURES, "porch-clip.mp4"));
const USER_DATA_BOX = "udta";

async function attach(page: Page, name: string, buffer: Buffer, mimeType: string) {
  await page
    .getByTestId("attachment-drop")
    .locator('input[type="file"]')
    .setInputFiles({ name, mimeType, buffer });
  return page.getByTestId("attachment").filter({ hasText: name.replace(/\.\w+$/, "") });
}

// Opens the post in the editor, where the delete link is, and deletes it.
async function deletePost(page: Page, title: string): Promise<void> {
  await page.goto("/write");
  await page.getByTestId("my-posts").getByRole("link", { name: title }).click();
  await deleteCurrentPost(page);
}

async function removeUpload(page: Page, name: string): Promise<void> {
  const row = page.getByTestId("attachment").filter({ hasText: name });
  await row.getByRole("button", { name: "Remove" }).click();
  await expect(row).toHaveCount(0);
}

test("an iPhone HEIC photo is published as AVIF", async ({ page }) => {
  const stamp = Date.now().toString(36);
  const photo = `porch-${stamp}.heic`;
  await devSignIn(page, THEO);
  await page.goto("/write");
  const row = await attach(page, photo, HEIC, "image/heic");
  await insertUpload(row);
  const bodyMd = page.locator('input[name="bodyMd"]');
  await expect(bodyMd).toHaveValue(/!\[porch [^\]]+\]\(http[^)]+\.avif\)/);
  const url = /\((http[^)]+\.avif)\)/.exec(await bodyMd.inputValue())?.[1] ?? "";
  const copy = await page.request.get(url);
  expect(copy.headers()["content-type"]).toBe("image/avif");

  await removeUpload(page, photo);
});

test("a video is prepared in the browser, checked, and plays in the post", async ({
  page,
}) => {
  const stamp = Date.now().toString(36);
  const clip = `clip-${stamp}.mp4`;
  const title = `Porch clip ${stamp}`;
  await devSignIn(page, THEO);
  await page.goto("/write");
  await page.getByLabel("Title").fill(title);
  await fillBodyMarkdown(page, "The light at dusk.");
  await page.getByRole("button", { name: "Rich text", exact: true }).click();

  const row = await attach(page, clip, CLIP, "video/mp4");
  await insertUpload(row);
  const bodyMd = page.locator('input[name="bodyMd"]');
  await expect(bodyMd).toHaveValue(/\[clip-[^\]]+\]\(http[^)]+\.mp4\)/);

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(new RegExp(`/@theo/porch-clip-${stamp}$`));
  const video = page.getByTestId("post-body").locator("video");
  await expect(video).toHaveAttribute(
    "src",
    /\/storage\/v1\/object\/public\/public-media\/.+\.mp4$/,
  );

  // The public copy is the prepared file: an MP4 with no user data (title, location).
  const src = (await video.getAttribute("src")) ?? "";
  const published = await page.request.get(src);
  expect(published.headers()["content-type"]).toBe("video/mp4");
  const bytes = await published.body();
  expect(bytes.includes(USER_DATA_BOX)).toBe(false);
  expect(CLIP.includes(USER_DATA_BOX)).toBe(true);
  // Its movie box comes right after `ftyp`, so playback can start at once.
  expect(bytes.subarray(4, 8).toString("latin1")).toBe("ftyp");
  const ftypSize = bytes.readUInt32BE(0);
  expect(bytes.subarray(ftypSize + 4, ftypSize + 8).toString("latin1")).toBe("moov");

  await deletePost(page, title);
});

// Issue #90: the queue shows a held HEIC photo and a held video properly. The fake
// scanner cannot flag either (it never sees the marker through a conversion), so the
// test marks both flagged in the database, the state a real scanner leaves.
test("the queue shows a held HEIC photo as an image and a held video as a player", async ({
  page,
  browser,
}) => {
  const stamp = Date.now().toString(36);
  const photo = `held-photo-${stamp}.heic`;
  const clip = `held-clip-${stamp}.mp4`;
  await devSignIn(page, THEO);
  await page.goto("/write");
  await page.getByLabel("Title").fill(`Held media ${stamp}`);
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]{36}$/);
  const editor = page.url();
  for (const [name, bytes, type] of [
    [photo, HEIC, "image/heic"],
    [clip, CLIP, "video/mp4"],
  ] as const) {
    const row = await attach(page, name, bytes, type);
    await expect(row.getByRole("button", { name: "Remove" })).toBeVisible();
  }
  const rows = (await (
    await rest(`media_assets?select=id,kind&original_filename=like.held-*-${stamp}.*`, {
      method: "GET",
    })
  ).json()) as { id: string; kind: string }[];
  const photoId = rows.find((row) => row.kind === "image")?.id ?? "";
  const clipId = rows.find((row) => row.kind === "video")?.id ?? "";
  expect(photoId).not.toBe("");
  expect(clipId).not.toBe("");
  await rest(`media_assets?id=in.(${photoId},${clipId})`, {
    method: "PATCH",
    body: JSON.stringify({ scan_status: "flagged" }),
  });

  const mira = await browser.newPage();
  await devSignIn(mira, MIRA);
  await mira.goto("/mod/queue?filter=flagged");

  const heldPhoto = mira.locator(`[data-media-id="${photoId}"]`).locator("img");
  await expect(heldPhoto).toHaveAttribute("src", `/mod/queue/held/${photoId}`);
  await expect
    .poll(() => heldPhoto.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  const served = await mira.request.get(`/mod/queue/held/${photoId}`);
  expect(served.headers()["content-type"]).toBe("image/jpeg");
  // Nobody but its owner and staff gets the original.
  expect((await page.request.get(`/mod/queue/held/${photoId}`)).ok()).toBe(true);
  const visitor = await browser.newPage();
  expect((await visitor.request.get(`/mod/queue/held/${photoId}`)).status()).toBe(404);

  const heldClip = mira.locator(`[data-media-id="${clipId}"]`);
  const player = heldClip.locator("video");
  await expect
    .poll(() => player.evaluate((video: HTMLVideoElement) => video.readyState))
    .toBeGreaterThan(0);
  // A video cannot be a cover, so the only answer is to turn it down.
  await expect(heldClip.getByTestId("queue-approve-mature")).toHaveCount(0);
  await expect(heldClip.getByTestId("queue-reject")).toBeVisible();

  // The post's uploads go with it (#80).
  await page.goto(editor);
  await deleteCurrentPost(page);
});
