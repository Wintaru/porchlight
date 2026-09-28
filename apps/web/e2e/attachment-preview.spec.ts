import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Locator, type Page, type Route, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, openUploadPreview, THEO } from "./helpers";
import { rest } from "./service-rest";

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
  let preview = await openUploadPreview(photoRow);
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
  preview = await openUploadPreview(photoRow);
  await preview.getByRole("button", { name: "Insert" }).click();
  await expect(preview).toBeHidden();
  await expect(bodyMd).toHaveValue(/!\[porch [^\]]+\]\(http[^)]+\)/);

  // The video plays in the page.
  const clipRow = await attach(page, clip, CLIP, "video/mp4");
  preview = await openUploadPreview(clipRow);
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
  preview = await openUploadPreview(pdfRow);
  await expect(preview.getByRole("heading", { name: pdf })).toBeVisible();
  await expect(preview).toContainText("application/pdf");
  await expect(preview).toContainText(/\d+(\.\d+)? (B|KB|MB)/);
  await expect(preview.locator("img, video")).toHaveCount(0);
  await preview.getByRole("button", { name: "Insert" }).click();
  await expect(preview).toBeHidden();
  await expect(bodyMd).toHaveValue(/\[cutlist-[^\]]+\]\([^)]+download=/);

  // A flagged image waits for a moderator: no picture, nothing to insert.
  const flaggedRow = await attach(page, flagged, FLAGGED_PHOTO, "image/jpeg");
  preview = await openUploadPreview(flaggedRow);
  await expect(preview).toContainText("A moderator looks at it first");
  await expect(preview.locator("img")).toHaveCount(0);
  await expect(preview.getByRole("button", { name: "Insert" })).toHaveCount(0);
  await preview.getByRole("button", { name: "Close" }).click();
  await expect(preview).toBeHidden();

  // The Delete link shows on a loaded post, not on one autosave just gave an id.
  await page.reload();
  await deleteCurrentPost(page);
});

// #91: the preview shows the upload as the panel holds it now, so a "Try again" that
// finishes while the preview is open shows in it. It also works on an upload in no post.
test("a Try again that finishes while the preview is open updates it", async ({
  page,
}) => {
  const name = `retry-${Date.now().toString(36)}.jpg`;
  await devSignIn(page, THEO);
  // No title, so no post: the upload is in no post.
  await page.goto("/write");
  await attach(page, name, PHOTO, "image/jpeg");
  const [asset] = (await (
    await rest(`media_assets?select=id&original_filename=eq.${name}`, { method: "GET" })
  ).json()) as { id: string }[];
  if (asset === undefined) {
    throw new Error(`no upload named ${name}`);
  }
  // As if the public copy could not be made: the scan cleared it, so it can be retried.
  await rest(`media_assets?id=eq.${asset.id}`, {
    method: "PATCH",
    body: JSON.stringify({ published_path: null }),
  });

  await page.goto("/write");
  await page.getByTestId("unattached-uploads").locator("summary").click();
  const row = page.getByTestId("unattached-upload").filter({ hasText: name });
  await expect(row).toContainText("not ready to show yet");

  // The retry's answer waits until the preview is open. Only the call for this upload
  // is held, so no other call can queue behind it.
  const held: Route[] = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (
      request.method() === "POST" &&
      request.headers()["next-action"] !== undefined &&
      (request.postData() ?? "").includes(asset.id)
    ) {
      held.push(route);
      return;
    }
    await route.fallback();
  });
  await row.getByRole("button", { name: "Try again" }).click();
  await expect.poll(() => held.length).toBe(1);
  const preview = await openUploadPreview(row);
  await expect(preview).toContainText("It is not ready to show yet.");
  await held[0]?.continue();
  await expect(preview.getByRole("img", { name })).toHaveAttribute(
    "src",
    /\/storage\/v1\/object\/public\/public-media\//,
  );
  await expect(preview.getByRole("button", { name: "Insert" })).toBeVisible();
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await preview.getByRole("button", { name: "Close" }).click();
  await expect(row).not.toContainText("not ready to show yet");
  await expect(row.getByRole("button", { name: "Try again" })).toHaveCount(0);

  await row.getByRole("button", { name: "Remove" }).click();
  await expect(row).toHaveCount(0);
});
