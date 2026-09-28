import { expect, test } from "@playwright/test";

import {
  backdateSubscriber,
  deleteSubscribers,
  runEmailSweep,
  setPostAnnounced,
  subscriberCount,
} from "./email-admin";
import { emailTo } from "./mailbox";

// Reader subscriptions by email (#22, D20). A visitor subscribes to one author, confirms
// from the email, gets the author's new post from the sweep, and unsubscribes from it.
const THEO_PUBLIC_POST = "00000000-0000-4000-8000-0000000000b2";

function linkIn(text: string, path: string): string {
  const match = new RegExp(`(https?://\\S+${path}\\?token=\\S+)`).exec(text)?.[1];
  if (match === undefined) {
    throw new Error(`no ${path} link in the email`);
  }
  const url = new URL(match);
  return `${url.pathname}${url.search}`;
}

test.describe("subscribe by email", () => {
  const reader = `reader-${String(Date.now())}@example.test`;

  test.afterEach(async () => {
    await deleteSubscribers(reader);
    await setPostAnnounced(THEO_PUBLIC_POST, false);
  });

  test("a visitor subscribes to an author, confirms, gets a post, and unsubscribes", async ({
    page,
    baseURL,
  }) => {
    const since = new Date(Date.now() - 1000);
    await page.goto("/@theo");
    const card = page.locator("#subscribe");
    await card.getByLabel("Email").fill(reader);
    await card.getByLabel("How often").selectOption("hourly");
    await card.getByRole("button", { name: "Subscribe" }).click();
    await expect(page.getByTestId("subscribe-status")).toContainText("Check your email");

    // The email goes out after the page answers (#84), and names the author by handle
    // only: a display name is text any member can set.
    const confirmation = await emailTo(reader, since, "Confirm your subscription");
    expect(confirmation.subject).toContain("@theo on");
    expect(confirmation.text).not.toContain("Theo Lindqvist");
    await page.goto(linkIn(confirmation.text, "/email/confirm"));
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByTestId("subscribe-confirmed")).toBeVisible();

    await setPostAnnounced(THEO_PUBLIC_POST, true);
    await backdateSubscriber(reader);
    const beforeSweep = new Date(Date.now() - 1000);
    await runEmailSweep(baseURL ?? "");
    const digest = await emailTo(reader, beforeSweep, "New from @theo");
    expect(digest.text).not.toContain("Theo Lindqvist");
    expect(digest.text).toContain("Hello from the porch");
    expect(digest.text).toContain("/@theo/hello-from-the-porch");

    await page.goto(linkIn(digest.text, "/email/unsubscribe"));
    await page.getByRole("button", { name: "Unsubscribe" }).click();
    await expect(page.getByTestId("unsubscribe-done")).toBeVisible();
    expect(await subscriberCount(reader)).toBe(0);
  });

  test("an address that is not one is refused on the page", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("#subscribe");
    // The browser's own check would stop "not-an-address"; this one passes it.
    await card.getByLabel("Email").fill("a@b");
    await card.getByRole("button", { name: "Subscribe" }).click();
    await expect(page.getByTestId("subscribe-status")).toHaveText(
      "That does not look like an email address.",
    );
  });

  test("a used or unknown confirmation link says so", async ({ page }) => {
    await page.goto("/email/confirm?token=nope");
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByTestId("subscribe-invalid")).toBeVisible();
  });
});
