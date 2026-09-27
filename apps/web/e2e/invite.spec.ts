import { type Browser, expect, type Page, test } from "@playwright/test";

import { authUserExists, authUserId, deleteAuthUser } from "./auth-admin";
import { devSignIn, LAMPLIGHTER } from "./helpers";
import { expectNoEmail, signInLinkFor } from "./mailbox";
import { rest } from "./service-rest";

// Issue #25: with sign-up by invite, a friend joins through a link and lands trusted;
// the same one-use link lets nobody else in.

// The emailed sign-in link is built for port 3000 (see magic-link.spec.ts).
test.skip(
  (process.env.PORT ?? "3000") !== "3000",
  "The emailed link points at port 3000 (supabase/config.toml site_url).",
);

const LAMPLIGHTER_ID = "00000000-0000-4000-8000-000000000001";

async function withFreshBrowser(
  browser: Browser,
  run: (page: Page) => Promise<void>,
): Promise<void> {
  const context = await browser.newContext();
  try {
    await run(await context.newPage());
  } finally {
    await context.close();
  }
}

async function askForLink(page: Page, email: string): Promise<Date> {
  const since = new Date(Math.floor(Date.now() / 1000) * 1000);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByTestId("sign-in-link-sent")).toBeVisible();
  return since;
}

// A member this test made: the profile row first (it has no foreign key to the auth
// user, and its quota row goes with it), then the auth user.
async function removeMember(email: string): Promise<void> {
  const id = await authUserId(email);
  if (id !== undefined) {
    await rest(`profiles?id=eq.${id}`, { method: "DELETE" });
  }
  await deleteAuthUser(email);
}

test("a friend joins through an invite link as trusted, and a used link lets nobody else in", async ({
  page,
  browser,
}) => {
  const stamp = Date.now().toString(36);
  const friend = `invitee-${stamp}@porchlight.local`;
  const stranger = `latecomer-${stamp}@porchlight.local`;

  await devSignIn(page, LAMPLIGHTER);
  await page.goto("/admin");
  try {
    await page.getByTestId("preset-friends").click();
    await expect(page).toHaveURL(/\/admin\?done=saved$/);

    const form = page.getByTestId("invite-form");
    await form.getByRole("button", { name: "Make an invite link" }).click();
    const link = await page.getByTestId("invite-link").innerText();
    const path = new URL(link).pathname;

    await withFreshBrowser(browser, async (visitor) => {
      await visitor.goto(path);
      await expect(
        visitor.getByRole("heading", { name: "You are invited" }),
      ).toBeVisible();
      const since = await askForLink(visitor, friend);
      await visitor.goto(await signInLinkFor(friend, since));
      await visitor.getByRole("button", { name: "Finish signing in" }).click();
      await expect(visitor.getByTestId("session-handle")).toBeVisible();
      await visitor.goto("/settings");
      await expect(visitor.getByText("Trusted member")).toBeVisible();
    });

    // The link was for one person: the next visitor gets the same answer, and no mail.
    await withFreshBrowser(browser, async (visitor) => {
      await visitor.goto(path);
      const since = await askForLink(visitor, stranger);
      await expectNoEmail(stranger, since);
      expect(await authUserExists(stranger)).toBe(false);
    });

    await page.goto("/admin#invites");
    // Filtered, not `.first()`: CI run 36330965295 listed a second, unused invite above
    // this one. Its source is not known yet; this test only needs the used link's count.
    await expect(
      page.getByTestId("invite-row").filter({ hasText: "1 of 1 joined" }),
    ).toHaveCount(1);
  } finally {
    await page.goto("/admin");
    await page.getByTestId("preset-open_porch").click();
    await expect(page).toHaveURL(/\/admin\?done=saved$/);
    await rest(`invites?created_by=eq.${LAMPLIGHTER_ID}`, { method: "DELETE" });
    await removeMember(friend);
    // Only there if the check above failed.
    await removeMember(stranger);
  }
});
