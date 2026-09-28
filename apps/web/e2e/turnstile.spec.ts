import { expect, test, type Frame, type Page } from "@playwright/test";

import { deleteSubscribers } from "./email-admin";
import { TURNSTILE_BASE_URL } from "./servers";

// The Turnstile box in the home page's subscribe card (#103). It stays hidden unless
// Cloudflare needs a click, and when it shows it fits the card. This file runs against
// the second dev server, whose test site key always asks for a click, so the box always
// shows here.
test.use({ baseURL: TURNSTILE_BASE_URL });

const PHONE_WIDTH = 375;
// Where the compact box draws its checkbox. The box's own page keeps its controls in a
// closed shadow root, so no locator reaches them and the test clicks the spot instead.
const CHECKBOX_POSITION = { x: 22, y: 32 } as const;

async function turnstileFrame(page: Page): Promise<Frame> {
  await expect
    .poll(() =>
      page.frames().some((frame) => frame.url().includes("challenges.cloudflare.com")),
    )
    .toBe(true);
  const frame = page
    .frames()
    .find((candidate) => candidate.url().includes("challenges.cloudflare.com"));
  if (frame === undefined) {
    throw new Error("no Turnstile frame on the page");
  }
  return frame;
}

async function expectBoxInsideCard(page: Page): Promise<void> {
  const frame = await turnstileFrame(page);
  const frameElement = await frame.frameElement();
  // The box grows to its real size once Cloudflare decides to show it.
  await expect
    .poll(async () => (await frameElement.boundingBox())?.width ?? 0)
    .toBeGreaterThan(1);
  const box = await frameElement.boundingBox();
  const card = await page.locator("#subscribe").boundingBox();
  if (card === null || box === null) {
    throw new Error("the card or the Turnstile box has no layout");
  }
  expect(box.x).toBeGreaterThanOrEqual(card.x);
  expect(box.x + box.width).toBeLessThanOrEqual(card.x + card.width);
  expect(box.y).toBeGreaterThanOrEqual(card.y);
  expect(box.y + box.height).toBeLessThanOrEqual(card.y + card.height);
}

test.describe("the Turnstile box", () => {
  const reader = `turnstile-${String(Date.now())}@example.test`;

  test.afterEach(async () => {
    await deleteSubscribers(reader);
  });

  test("is interaction-only and fits the subscribe card", async ({ page }) => {
    await page.goto("/");
    const widget = page.locator("#subscribe .cf-turnstile");
    await expect(widget).toHaveAttribute("data-appearance", "interaction-only");
    await expectBoxInsideCard(page);
  });

  test("fits the subscribe card at phone width", async ({ page }) => {
    await page.setViewportSize({ width: PHONE_WIDTH, height: 800 });
    await page.goto("/");
    await expectBoxInsideCard(page);
  });

  test("a subscribe with the box answered succeeds", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("#subscribe");
    const token = card.locator('input[name="cf-turnstile-response"]');
    // No token before the visitor answers. In production, siteverify refuses a submit
    // without one; this server runs the fake, so the test only checks the field.
    await expect(token).toHaveValue("");
    await expectBoxInsideCard(page);
    const frame = await turnstileFrame(page);
    const frameElement = await frame.frameElement();
    // The checkbox draws a moment after the box takes its size, and a click before that
    // lands on nothing, so the click repeats until the token arrives.
    await expect(async () => {
      await frameElement.click({ position: CHECKBOX_POSITION });
      await expect(token).not.toHaveValue("", { timeout: 2_000 });
    }).toPass({ timeout: 20_000 });

    await card.getByLabel("Email").fill(reader);
    await card.getByRole("button", { name: "Subscribe" }).click();
    await expect(page.getByTestId("subscribe-status")).toContainText("Check your email");
  });
});
