import { expect, test } from "@playwright/test";

import {
  addReplyNotification,
  backdateDigest,
  deleteNotification,
  resetEmailPreferences,
  runEmailSweep,
} from "./email-admin";
import { devSignIn, JUNE, MIRA } from "./helpers";
import { emailTo } from "./mailbox";

// Email digests (#22, D14). The local stack runs the fake provider, which delivers to
// the mail catcher, so these read the real message the sweep sent.
test.describe("email digests", () => {
  test.afterEach(async () => {
    await resetEmailPreferences("june");
    await resetEmailPreferences("mira");
  });

  test("a member turns on a digest, the sweep mails it, and its link turns email off", async ({
    page,
    baseURL,
  }) => {
    await devSignIn(page, JUNE);
    await page.goto("/settings#email");
    const email = page.locator("#email");
    // The queue email is for staff only.
    await expect(email.getByLabel(/moderation queue/)).toHaveCount(0);
    await email.getByLabel("Digest of your notifications").selectOption("hourly");
    await email.getByRole("button", { name: "Save email settings" }).click();
    await expect(page.getByTestId("email-status")).toHaveText("Saved.");

    await backdateDigest("june");
    const notification = await addReplyNotification("june");
    try {
      const since = new Date(Date.now() - 1000);
      await runEmailSweep(baseURL ?? "");
      const digest = await emailTo(JUNE.email, since, "What is new for you on");
      expect(digest.text).toContain("Someone replied to your comment");

      const link = /(http\S+\/email\/unsubscribe\?token=\S+)/.exec(digest.text)?.[1];
      expect(link).toBeDefined();
      await page.goto(new URL(link ?? "").pathname + new URL(link ?? "").search);
      await page.getByRole("button", { name: "Unsubscribe" }).click();
      await expect(page.getByTestId("unsubscribe-done")).toBeVisible();

      await page.goto("/settings#email");
      await expect(email.getByLabel("Digest of your notifications")).toHaveValue("off");
    } finally {
      await deleteNotification(notification);
    }
  });

  test("a moderator can ask for the queue at once", async ({ page }) => {
    await devSignIn(page, MIRA);
    await page.goto("/settings#email");
    const email = page.locator("#email");
    await email.getByLabel(/moderation queue/).check();
    await email.getByRole("button", { name: "Save email settings" }).click();
    await expect(page.getByTestId("email-status")).toHaveText("Saved.");
    await expect(email.getByLabel(/moderation queue/)).toBeChecked();
  });

  test("the sweep answers nothing without the scheduler's secret", async ({
    request,
  }) => {
    const response = await request.post("/api/email/digest");
    expect(response.status()).toBe(404);
  });
});
