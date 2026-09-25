import { expect, type Locator, type Page, test } from "@playwright/test";

import { devSignIn, JUNE, THEO } from "./helpers";

// The issue #9 acceptance test, on the #52 panel: the server checks magic bytes, not
// extensions (SPEC.md §6), a non-image is served as a download rather than inline, and
// a member over quota sees why. Uploads now outlive the page (the panel lists them
// again), so every test removes what it uploaded.

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);

async function attach(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
): Promise<void> {
  await page
    .getByTestId("attachment-drop")
    .locator('input[type="file"]')
    .setInputFiles(file);
}

function row(page: Page, name: string): Locator {
  return page.getByTestId("attachment").filter({ hasText: name });
}

async function removeRow(page: Page, name: string): Promise<void> {
  await row(page, name).getByRole("button", { name: "Remove" }).click();
  await expect(row(page, name)).toHaveCount(0);
}

test("a real PNG header is accepted; an SVG renamed to .png is refused", async ({
  page,
}) => {
  const name = `porch-${Date.now().toString(36)}.png`;
  await devSignIn(page, THEO);
  await page.goto("/write");

  await attach(page, { name, mimeType: "image/png", buffer: PNG_SIGNATURE });
  await expect(row(page, name).getByRole("button", { name: "Remove" })).toBeVisible();
  // Only a signature, not a picture: it cannot be re-encoded, so it has no public copy
  // and nothing to insert.
  await expect(row(page, name).getByRole("button", { name: "Insert" })).toHaveCount(0);

  const svgDisguisedAsPng = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  await attach(page, {
    name: "sneaky.png",
    mimeType: "image/png",
    buffer: svgDisguisedAsPng,
  });
  await expect(row(page, "sneaky.png")).toHaveText(/sneaky\.png:.*not accepted/);

  await removeRow(page, name);
});

test("a non-image attachment goes in as a download, not inline", async ({ page }) => {
  const name = `notes-${Date.now().toString(36)}.pdf`;
  await devSignIn(page, THEO);
  await page.goto("/write");

  const pdfBytes = Buffer.from("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<<>>\nendobj\n");
  await attach(page, { name, mimeType: "application/pdf", buffer: pdfBytes });
  await row(page, name).getByRole("button", { name: "Insert" }).click();
  await page.getByRole("button", { name: "Markdown", exact: true }).click();
  const body = await page.getByLabel("Body (markdown)").inputValue();
  const href = /\]\((?<url>[^)]+)\)/.exec(body)?.groups?.url ?? "";
  expect(href).toContain("download=");

  const response = await page.request.get(href);
  expect(response.headers()["content-disposition"]).toContain("attachment");

  await removeRow(page, name);
});

test("a probation member over the per-file cap sees the cap, not a generic failure", async ({
  page,
}) => {
  await devSignIn(page, JUNE);
  await page.goto("/write");

  const overCap = Buffer.concat([PNG_SIGNATURE, Buffer.alloc(6 * 1024 * 1024)]);
  await attach(page, { name: "big.png", mimeType: "image/png", buffer: overCap });
  await expect(row(page, "big.png")).toHaveText(/big\.png:.*per-file limit/);
});

test("an upload is listed again after a reload, until it is removed", async ({
  page,
}) => {
  const name = `kept-${Date.now().toString(36)}.png`;
  await devSignIn(page, THEO);
  await page.goto("/write");
  await attach(page, { name, mimeType: "image/png", buffer: PNG_SIGNATURE });
  await expect(row(page, name)).toBeVisible();

  await page.reload();
  await expect(row(page, name)).toBeVisible();
  await removeRow(page, name);
  await page.reload();
  await expect(page.getByTestId("attachment-drop")).toBeVisible();
  await expect(row(page, name)).toHaveCount(0);
});
