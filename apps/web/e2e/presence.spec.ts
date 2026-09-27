import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  test,
} from "@playwright/test";

import { devSignIn, JUNE, type SeedMember, THEO } from "./helpers";
import { rest } from "./service-rest";

// Issue #75: typing indicators and who is online, over Realtime Presence, seen from a
// second signed-in browser.

const POST = "/@theo/hello-from-the-porch";
const THEO_ID = "00000000-0000-4000-8000-000000000003";
const JUNE_ID = "00000000-0000-4000-8000-000000000004";

async function signedIn(
  browser: Browser,
  member: SeedMember,
): Promise<{
  context: BrowserContext;
  page: Page;
}> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await devSignIn(page, member);
  return { context, page };
}

async function setShowPresence(profileId: string, visible: boolean): Promise<void> {
  await rest(`profiles?id=eq.${profileId}`, {
    method: "PATCH",
    body: JSON.stringify({ show_presence: visible }),
  });
}

test.describe("presence", () => {
  test("a member typing a comment shows to another reader, and clears when they stop", async ({
    browser,
  }) => {
    const theo = await signedIn(browser, THEO);
    const june = await signedIn(browser, JUNE);
    try {
      await theo.page.goto(POST);
      await june.page.goto(POST);
      const indicator = theo.page.getByTestId("typing-indicator");
      await expect(indicator).toHaveText("");

      await june.page.getByTestId("comment-form").getByLabel("Your comment").fill("Hel");
      await june.page
        .getByTestId("comment-form")
        .getByLabel("Your comment")
        .pressSequentially("lo");
      await expect(indicator).toHaveText("@june is replying…", { timeout: 10_000 });
      // June never sees herself.
      await expect(june.page.getByTestId("typing-indicator")).toHaveText("");

      // Four seconds after the last keystroke she stops showing.
      await expect(indicator).toHaveText("", { timeout: 10_000 });

      // With presence off, her typing sends nothing.
      await setShowPresence(JUNE_ID, false);
      await june.page.reload();
      await june.page
        .getByTestId("comment-form")
        .getByLabel("Your comment")
        .fill("Quiet");
      // The same wait the "on" case needed to show, and then some.
      await june.page.waitForTimeout(3000);
      await expect(indicator).toHaveText("");
    } finally {
      await setShowPresence(JUNE_ID, true);
      await theo.context.close();
      await june.context.close();
    }
  });

  test("the home page shows both members online, and never a hidden or muted one", async ({
    browser,
  }) => {
    const theo = await signedIn(browser, THEO);
    const june = await signedIn(browser, JUNE);
    try {
      await theo.page.goto("/");
      await june.page.goto("/");
      const online = theo.page.getByTestId("online-member");
      await expect(online).toHaveCount(2, { timeout: 10_000 });
      await expect(june.page.getByTestId("online-member")).toHaveCount(2, {
        timeout: 10_000,
      });

      // June turns presence off: Theo sees only himself, June still sees Theo.
      await setShowPresence(JUNE_ID, false);
      await june.page.reload();
      await expect(online).toHaveCount(1, { timeout: 10_000 });
      await expect(june.page.getByTestId("online-member")).toHaveCount(1, {
        timeout: 10_000,
      });
      await setShowPresence(JUNE_ID, true);
      await june.page.reload();
      await expect(online).toHaveCount(2, { timeout: 10_000 });

      // Theo mutes June: she is not shown to him, though she is online.
      await rest("member_blocks", {
        method: "POST",
        body: JSON.stringify({ member_id: THEO_ID, target_id: JUNE_ID, level: "mute" }),
      });
      await theo.page.reload();
      await expect(theo.page.getByTestId("online-member")).toHaveCount(1, {
        timeout: 10_000,
      });
    } finally {
      await setShowPresence(JUNE_ID, true);
      await rest(`member_blocks?member_id=eq.${THEO_ID}&target_id=eq.${JUNE_ID}`, {
        method: "DELETE",
      });
      await theo.context.close();
      await june.context.close();
    }
  });

  test("a visitor sees no one online", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("online-now")).toHaveCount(0);
  });
});
