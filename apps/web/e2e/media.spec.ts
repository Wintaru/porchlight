import { readFileSync } from "node:fs";
import { join } from "node:path";

import { type Browser, expect, type Page, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, fillBodyMarkdown, MIRA, THEO } from "./helpers";

// Issues #36 and #52: an image goes up, gets a re-encoded public copy with its metadata
// stripped, and goes into a post as its cover and in its body; a PDF goes in as a
// download card; a flagged cover holds the post for a moderator, who approves it as
// mature, and the reader sees it blurred until they choose to look. Every post a test
// writes it deletes, and every upload it removes.

const FIXTURES = join(import.meta.dirname, "fixtures");
const PHOTO = readFileSync(join(FIXTURES, "porch-photo.jpg"));
const PDF = readFileSync(join(FIXTURES, "sawhorse-cutlist.pdf"));
// FakeClassifyImageHandler's FAKE_FLAG_MARKER: a real image with it at the end scores
// as flagged on the local stack.
const FLAGGED_PHOTO = Buffer.concat([
  PHOTO,
  Buffer.from("porchlight:fake-classifier-flag"),
]);

function file(name: string, buffer: Buffer, mimeType = "image/jpeg") {
  return { name, mimeType, buffer };
}

async function chooseCover(page: Page, name: string, buffer: Buffer): Promise<void> {
  await page
    .getByTestId("cover-drop")
    .locator('input[type="file"]')
    .setInputFiles(file(name, buffer));
}

async function attach(page: Page, name: string, buffer: Buffer, mimeType: string) {
  await page
    .getByTestId("attachment-drop")
    .locator('input[type="file"]')
    .setInputFiles(file(name, buffer, mimeType));
  return page.getByTestId("attachment").filter({ hasText: name });
}

async function removeUploads(page: Page, names: readonly string[]): Promise<void> {
  await page.goto("/write");
  for (const name of names) {
    const row = page.getByTestId("attachment").filter({ hasText: name });
    await row.getByRole("button", { name: "Remove" }).click();
    await expect(row).toHaveCount(0);
  }
}

test("a cover, a picture and a PDF go into a post, from a re-encoded public copy", async ({
  page,
}) => {
  const stamp = Date.now().toString(36);
  const [cover, picture, pdf] = [
    `cover-${stamp}.jpg`,
    `inside-${stamp}.jpg`,
    `cutlist-${stamp}.pdf`,
  ];
  await devSignIn(page, THEO);
  await page.goto("/write");
  await page.getByLabel("Title").fill(`Sawhorse notes ${stamp}`);
  await fillBodyMarkdown(page, "Two 2x4s and a cut list.");
  await page.getByRole("button", { name: "Rich text", exact: true }).click();

  await chooseCover(page, cover, PHOTO);
  const coverImage = page.getByTestId("cover-image");
  await expect(coverImage).toBeVisible();
  const coverUrl = (await coverImage.getAttribute("src")) ?? "";
  expect(coverUrl).toContain("/storage/v1/object/public/public-media/");

  // The public copy is a fresh encode: the photo's EXIF (an artist, a location) is gone.
  const copy = await page.request.get(coverUrl);
  expect(copy.headers()["content-type"]).toBe("image/jpeg");
  expect((await copy.body()).includes("Exif")).toBe(false);
  expect(PHOTO.includes("Exif")).toBe(true);

  // The hidden field is the sync point: it changes once the editor has the insert.
  const bodyMd = page.locator('input[name="bodyMd"]');
  await (
    await attach(page, picture, PHOTO, "image/jpeg")
  )
    .getByRole("button", { name: "Insert" })
    .click();
  await expect(bodyMd).toHaveValue(/!\[inside [^\]]+\]\(http/);
  await (
    await attach(page, pdf, PDF, "application/pdf")
  )
    .getByRole("button", { name: "Insert" })
    .click();
  // The second insert goes after the first, not over it.
  await expect(bodyMd).toHaveValue(/!\[inside .+\n\n\[cutlist-.+download=/s);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(new RegExp(`/@theo/sawhorse-notes-${stamp}$`));

  await expect(page.getByTestId("post-cover").locator("img")).toHaveAttribute(
    "src",
    coverUrl,
  );
  const body = page.getByTestId("post-body");
  await expect(body.locator("img")).toHaveAttribute(
    "src",
    /\/storage\/v1\/object\/public\/public-media\/.+\.jpg$/,
  );
  await expect(body.locator("img")).toHaveAttribute("alt", `inside ${stamp}`);
  await expect(body.getByRole("link", { name: new RegExp(pdf) })).toHaveAttribute(
    "href",
    /download=/,
  );

  // The quarantine original is never public.
  const quarantine = coverUrl.replace("/public/public-media/", "/public/quarantine/");
  expect((await page.request.get(quarantine)).ok()).toBe(false);

  await page.goto("/write");
  await page
    .getByTestId("my-posts")
    .getByRole("link", { name: `Sawhorse notes ${stamp}` })
    .click();
  // The saved cover comes back with the draft.
  await expect(page.getByTestId("cover-image")).toHaveAttribute("src", coverUrl);
  await deleteCurrentPost(page);
  await removeUploads(page, [cover, picture, pdf]);
});

async function queueAsMira(browser: Browser): Promise<Page> {
  const mira = await browser.newPage();
  await devSignIn(mira, MIRA);
  await mira.goto("/mod/queue?filter=flagged");
  return mira;
}

test("a flagged cover holds the post until a moderator approves it as mature", async ({
  page,
  browser,
}) => {
  const stamp = Date.now().toString(36);
  const title = `Figure study ${stamp}`;
  const cover = `study-${stamp}.jpg`;
  await devSignIn(page, THEO);
  await page.goto("/write");
  await page.getByLabel("Title").fill(title);
  await fillBodyMarkdown(page, "Charcoal, twenty minutes.");
  await chooseCover(page, cover, FLAGGED_PHOTO);
  await expect(page.getByTestId("cover-held")).toContainText("A moderator looks at this");

  // Theo is trusted, but the held cover sends the post to the queue.
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByTestId("post-status")).toHaveText("Waiting for approval");

  const mira = await queueAsMira(browser);
  const item = mira.getByTestId("queue-item").filter({ hasText: title });
  await expect(item.getByText("flagged image, needs review")).toBeVisible();
  const held = item.getByTestId("reveal-image");
  await expect(held).toHaveAttribute("data-mode", "review");
  // Blurred and grey until the moderator chooses to look.
  expect(
    await held.locator("img").evaluate((img) => getComputedStyle(img).filter),
  ).toContain("grayscale");
  await expect(item.getByTestId("queue-approve")).toHaveCount(0);
  await item.getByTestId("queue-approve-mature").click();
  await expect(mira.getByTestId("queue-status")).toHaveText("Approved.");

  const reader = await browser.newPage();
  await reader.goto(`/@theo/figure-study-${stamp}`);
  const shown = reader.getByTestId("post-cover").getByTestId("reveal-image");
  await expect(shown).toHaveAttribute("data-mode", "mature");
  const img = shown.locator("img");
  expect(await img.evaluate((el) => getComputedStyle(el).filter)).toContain("blur");
  await shown.getByText("Mature content. Show image").click();
  await expect.poll(() => img.evaluate((el) => getComputedStyle(el).filter)).toBe("none");

  await page.goto("/write");
  await page.getByTestId("my-posts").getByRole("link", { name: title }).click();
  await deleteCurrentPost(page);
  await removeUploads(page, [cover]);
});
