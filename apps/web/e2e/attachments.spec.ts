import { expect, type Page, test } from "@playwright/test";

import { devSignIn, JUNE, THEO } from "./helpers";

// The issue #9 acceptance test: the server checks magic bytes, not extensions
// (SPEC.md §6), a non-image is served as a download rather than inline, and a member
// over quota sees why. Runs against the seeded local stack; the panel has no
// server-side listing, so there is nothing left over to clean up once the page closes.

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);

function attachmentsInput(page: Page) {
  return page.getByLabel("Attachments");
}

test("a real PNG is accepted; an SVG renamed to .png is refused", async ({ page }) => {
  await devSignIn(page, THEO);
  await page.goto("/write");

  await attachmentsInput(page).setInputFiles({
    name: "porch.png",
    mimeType: "image/png",
    buffer: PNG_SIGNATURE,
  });
  await expect(page.getByRole("link", { name: "porch.png" })).toBeVisible();

  const svgDisguisedAsPng = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  await attachmentsInput(page).setInputFiles({
    name: "sneaky.png",
    mimeType: "image/png",
    buffer: svgDisguisedAsPng,
  });
  await expect(page.locator('[data-state="failed"]')).toHaveText(
    /sneaky\.png:.*not accepted/,
  );
});

test("a non-image attachment opens as a download link, not inline", async ({ page }) => {
  await devSignIn(page, THEO);
  await page.goto("/write");

  const pdfBytes = Buffer.from("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<<>>\nendobj\n");
  await attachmentsInput(page).setInputFiles({
    name: "notes.pdf",
    mimeType: "application/pdf",
    buffer: pdfBytes,
  });
  const link = page.getByRole("link", { name: "notes.pdf" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("target", "_blank");

  const href = await link.getAttribute("href");
  const response = await page.request.get(href ?? "");
  expect(response.headers()["content-disposition"]).toContain("attachment");
});

test("a probation member over the per-file cap sees the cap, not a generic failure", async ({
  page,
}) => {
  await devSignIn(page, JUNE);
  await page.goto("/write");

  const overCap = Buffer.concat([PNG_SIGNATURE, Buffer.alloc(6 * 1024 * 1024)]);
  await attachmentsInput(page).setInputFiles({
    name: "big.png",
    mimeType: "image/png",
    buffer: overCap,
  });
  await expect(page.locator('[data-state="failed"]')).toHaveText(
    /big\.png:.*per-file limit/,
  );
});

test("removing an attachment takes it off the list", async ({ page }) => {
  await devSignIn(page, THEO);
  await page.goto("/write");

  await attachmentsInput(page).setInputFiles({
    name: "porch.png",
    mimeType: "image/png",
    buffer: PNG_SIGNATURE,
  });
  const link = page.getByRole("link", { name: "porch.png" });
  await expect(link).toBeVisible();

  await page.getByRole("button", { name: "Remove" }).click();
  await expect(link).toHaveCount(0);
});
