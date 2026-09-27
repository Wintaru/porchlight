import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Locator, type Page, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, THEO } from "./helpers";

// Issue #80: pressing an upload in the Attachments panel opens a preview before
// anything goes in. An image shows, a video plays, and any other file is named with its
// type and size; Insert in the preview puts it in the body. A flagged image has no
// public copy, so its preview shows no picture and cannot insert. The post is deleted at
// the end, and its uploads go with it.

const FIXTURES = join(import.meta.dirname, "fixtures");
const PHOTO = readFileSync(join(FIXTURES, "porch-photo.jpg"));
const CLIP = readFileSync(join(FIXTURES, "porch-clip.mp4"));
const PDF = readFileSync(join(FIXTURES, "sawhorse-cutlist.pdf"));
// FakeClassifyImageHandler's FAKE_FLAG_MARKER: scores as flagged on the local stack.
const FLAGGED_PHOTO = Buffer.concat([
  PHOTO,
  Buffer.from("porchlight:fake-classifier-flag"),
]);

async function attach(
  page: Page,
  name: string,
  buffer: Buffer,
  mimeType: string,
): Promise<Locator> {
  await page
    .getByTestId("attachment-drop")
    .locator('input[type="file"]')
    .setInputFiles({ name, mimeType, buffer });
  const row = page.getByTestId("attachment").filter({ hasText: name });
  await expect(row.getByRole("button", { name: "Remove" })).toBeVisible();
  return row;
}

async function openPreview(page: Page, row: Locator): Promise<Locator> {
  await row.locator('button[aria-haspopup="dialog"]').click();
  const preview = page.getByTestId("attachment-preview");
  await expect(preview).toBeVisible();
  return preview;
}

test("an image, a video and a PDF each preview before they go in", async ({ page }) => {
  const stamp = Date.now().toString(36);
  const [photo, clip, pdf, flagged] = [
    `porch-${stamp}.jpg`,
    `clip-${stamp}.mp4`,
    `cutlist-${stamp}.pdf`,
    `held-${stamp}.jpg`,
  ];
  await devSignIn(page, THEO);
  await page.goto("/write");
  await page.getByLabel("Title").fill(`Previews ${stamp}`);
  // Autosave gives the post its id, so the uploads belong to it and go when it does.
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]{36}$/);
  const bodyMd = page.locator('input[name="bodyMd"]');

  // The image shows, from its public copy, and Escape closes the preview untouched.
  const photoRow = await attach(page, photo, PHOTO, "image/jpeg");
  let preview = await openPreview(page, photoRow);
  await expect(preview.getByRole("heading", { name: photo })).toBeVisible();
  const image = preview.getByRole("img", { name: photo });
  await expect(image).toHaveAttribute(
    "src",
    /\/storage\/v1\/object\/public\/public-media\//,
  );
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await expect(preview).toContainText("image/jpeg");
  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();
  await expect(bodyMd).toHaveValue("");
  preview = await openPreview(page, photoRow);
  await preview.getByRole("button", { name: "Insert" }).click();
  await expect(preview).toBeHidden();
  await expect(bodyMd).toHaveValue(/!\[porch [^\]]+\]\(http[^)]+\)/);

  // The video plays in the page.
  const clipRow = await attach(page, clip, CLIP, "video/mp4");
  preview = await openPreview(page, clipRow);
  const video = preview.locator("video");
  await expect(video).toHaveAttribute("src", /\.mp4$/);
  await video.evaluate((element: HTMLVideoElement) => {
    element.muted = true;
    return element.play();
  });
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThan(0);
  await preview.getByRole("button", { name: "Insert" }).click();
  await expect(preview).toBeHidden();
  await expect(bodyMd).toHaveValue(/\[clip-[^\]]+\]\(http[^)]+\.mp4\)/);

  // Any other file is named, with its type and size.
  const pdfRow = await attach(page, pdf, PDF, "application/pdf");
  preview = await openPreview(page, pdfRow);
  await expect(preview.getByRole("heading", { name: pdf })).toBeVisible();
  await expect(preview).toContainText("application/pdf");
  await expect(preview).toContainText(/\d+(\.\d+)? (B|KB|MB)/);
  await expect(preview.locator("img, video")).toHaveCount(0);
  await preview.getByRole("button", { name: "Insert" }).click();
  await expect(preview).toBeHidden();
  await expect(bodyMd).toHaveValue(/\[cutlist-[^\]]+\]\([^)]+download=/);

  // A flagged image waits for a moderator: no picture, nothing to insert.
  const flaggedRow = await attach(page, flagged, FLAGGED_PHOTO, "image/jpeg");
  preview = await openPreview(page, flaggedRow);
  await expect(preview).toContainText("A moderator looks at it first");
  await expect(preview.locator("img")).toHaveCount(0);
  await expect(preview.getByRole("button", { name: "Insert" })).toHaveCount(0);
  await preview.getByRole("button", { name: "Close" }).click();
  await expect(preview).toBeHidden();

  // The Delete link shows on a loaded post, not on one autosave just gave an id.
  await page.reload();
  await deleteCurrentPost(page);
});
