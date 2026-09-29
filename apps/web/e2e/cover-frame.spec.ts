import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Locator, type Page, test } from "@playwright/test";

import {
  deleteCurrentPost,
  devSignIn,
  fillBodyMarkdown,
  insertUpload,
  THEO,
} from "./helpers";

// The author frames the cover for the feed card: the editor shows the card's box with the
// rest of the picture shaded, and a drag, the arrow keys or the zoom slider move the
// picture in it. Every card box has one shape, on a wide screen and on a phone, and
// shows the framing. A picture already in the post can be the cover: the first one
// fills an empty cover on its own, and "Use as cover" picks any other.

const PHOTO = readFileSync(join(import.meta.dirname, "fixtures", "porch-photo.jpg"));
const COVER_ASPECT = 16 / 10;
const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 390, height: 844 };

async function attach(page: Page, name: string): Promise<Locator> {
  await page
    .getByTestId("attachment-drop")
    .locator('input[type="file"]')
    .setInputFiles({ name, mimeType: "image/jpeg", buffer: PHOTO });
  const row = page.getByTestId("attachment").filter({ hasText: name });
  await expect(row).toBeVisible();
  return row;
}

async function frameValues(page: Page) {
  const read = async (name: string) =>
    Number(await page.locator(`input[name="${name}"]`).inputValue());
  return {
    focusX: await read("coverFocusX"),
    focusY: await read("coverFocusY"),
    zoom: await read("coverZoom"),
  };
}

// The card's CSS value for a focus fraction, rounded as lib/cover-frame.ts rounds it.
function percent(fraction: number): string {
  return `${String(Math.round(fraction * 100 * 10_000) / 10_000)}%`;
}

async function dragBy(page: Page, target: Locator, dx: number, dy: number) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (box === null) {
    throw new Error("expected the framer to be visible");
  }
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 5 });
  await page.mouse.up();
}

test("a picture in the post becomes the cover, framed the same on every card", async ({
  page,
}) => {
  const stamp = Date.now().toString(36);
  const [first, second] = [`first-${stamp}.jpg`, `second-${stamp}.jpg`];
  const title = `Framed porch ${stamp}`;
  await devSignIn(page, THEO);
  await page.setViewportSize(DESKTOP);
  await page.goto("/write");
  await page.getByLabel("Title").fill(title);
  await fillBodyMarkdown(page, "The light at six.");
  await page.getByRole("button", { name: "Rich text", exact: true }).click();

  // The post's first picture fills the empty cover.
  const firstRow = await attach(page, first);
  await insertUpload(firstRow);
  const coverImage = page.getByTestId("cover-image");
  await expect(coverImage).toBeVisible();
  await expect(firstRow).toContainText("The cover");

  // Removed, it stays removed: the next picture does not fill it again.
  await page.getByRole("button", { name: "Remove cover" }).click();
  const secondRow = await attach(page, second);
  await insertUpload(secondRow);
  await expect(page.getByTestId("cover-drop")).toBeVisible();

  // "Use as cover" picks any picture in the list, without a second upload.
  await secondRow.getByRole("button", { name: "Use as cover" }).click();
  await expect(coverImage).toBeVisible();
  await expect(secondRow).toContainText("The cover");
  await expect(firstRow.getByRole("button", { name: "Use as cover" })).toBeVisible();
  expect(await frameValues(page)).toEqual({ focusX: 0.5, focusY: 0.5, zoom: 1 });

  // The framer's box has the card's shape.
  const frameBox = await page.getByTestId("cover-frame-box").boundingBox();
  expect((frameBox?.width ?? 0) / (frameBox?.height ?? 1)).toBeCloseTo(COVER_ASPECT, 1);

  // Zoom in, drag the picture right and down, then nudge it left with a key.
  await page.getByTestId("cover-zoom").fill("2");
  const framer = page.getByTestId("cover-framer");
  await dragBy(page, framer, 40, 30);
  const dragged = await frameValues(page);
  expect(dragged.zoom).toBe(2);
  expect(dragged.focusX).toBeLessThan(0.5);
  expect(dragged.focusY).toBeLessThan(0.5);
  await framer.focus();
  await page.keyboard.press("ArrowLeft");
  const framed = await frameValues(page);
  expect(framed.focusX).toBeGreaterThan(dragged.focusX);
  expect(framed.focusY).toBe(dragged.focusY);

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(new RegExp(`/@theo/framed-porch-${stamp}$`));

  // The card shows the framing, in a box of the same shape on a wide screen and a phone.
  await page.goto("/");
  const card = page.getByTestId("post-card").filter({ hasText: title });
  const cardCover = card.getByTestId("post-card-cover");
  const cardImage = cardCover.locator("img");
  await expect(cardImage).toHaveCSS(
    "object-position",
    `${percent(framed.focusX)} ${percent(framed.focusY)}`,
  );
  await expect(cardImage).toHaveCSS("transform", "matrix(2, 0, 0, 2, 0, 0)");
  for (const viewport of [DESKTOP, PHONE]) {
    await page.setViewportSize(viewport);
    const box = await cardCover.boundingBox();
    expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(COVER_ASPECT, 1);
  }

  // The framing comes back with the post, and on a phone a drag still moves it.
  await page.goto("/write");
  await page.getByTestId("my-posts").getByRole("link", { name: title }).click();
  await expect(coverImage).toBeVisible();
  expect(await frameValues(page)).toEqual(framed);
  await dragBy(page, page.getByTestId("cover-framer"), 0, -30);
  expect((await frameValues(page)).focusY).toBeGreaterThan(framed.focusY);

  await page.setViewportSize(DESKTOP);
  await deleteCurrentPost(page);
});
