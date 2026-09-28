import { createHash } from "node:crypto";

import { type Browser, expect, type Page, test } from "@playwright/test";

import { authUserExists, authUserId, deleteAuthUser } from "./auth-admin";
import { devSignIn, LAMPLIGHTER } from "./helpers";
import { expectNoEmail, signInLinkFor } from "./mailbox";
import { rest } from "./service-rest";

// Issue #25: with sign-up by invite, a friend joins through a link and lands trusted;
// the same one-use link lets nobody else in. Issue #92: the invite lives in the browser
// that opened the invite link, so a sign-in link opened in another browser is refused
// and leaves no account behind.

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

// Makes a one-use link on the admin page and answers its path, /invite/<token>.
async function makeInviteLink(admin: Page): Promise<string> {
  const form = admin.getByTestId("invite-form");
  await form.getByRole("button", { name: "Make an invite link" }).click();
  return new URL(await admin.getByTestId("invite-link").innerText()).pathname;
}

// Deletes only the link this test made, found by the hash the table keeps (the
// `invites.token_hash` shape: sha256 of the token, lowercase hex). Other links, from a
// person or a parallel run, stay.
async function deleteInvite(path: string | undefined): Promise<void> {
  const token = path?.split("/").pop();
  if (token === undefined || token === "") {
    return;
  }
  const hash = createHash("sha256").update(token).digest("hex");
  await rest(`invites?token_hash=eq.${hash}`, { method: "DELETE" });
}

// Sign-up by invite for the test, and back to the seed's open porch after it.
async function withInviteOnlySite(
  admin: Page,
  run: (makeLink: () => Promise<string>) => Promise<void>,
): Promise<void> {
  await devSignIn(admin, LAMPLIGHTER);
  await admin.goto("/admin");
  const made: string[] = [];
  try {
    await admin.getByTestId("preset-friends").click();
    await expect(admin).toHaveURL(/\/admin\?done=saved$/);
    await run(async () => {
      const path = await makeInviteLink(admin);
      made.push(path);
      return path;
    });
  } finally {
    await admin.goto("/admin");
    await admin.getByTestId("preset-open_porch").click();
    await expect(admin).toHaveURL(/\/admin\?done=saved$/);
    for (const path of made) {
      await deleteInvite(path);
    }
  }
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

  try {
    await withInviteOnlySite(page, async (makeLink) => {
      const path = await makeLink();

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

      // The link was for one person: the next visitor gets the same answer, and no
      // mail.
      await withFreshBrowser(browser, async (visitor) => {
        await visitor.goto(path);
        const since = await askForLink(visitor, stranger);
        await expectNoEmail(stranger, since);
        expect(await authUserExists(stranger)).toBe(false);
      });

      // No fragment: the toast strips `?done=saved` when it fades, and once the URL is
      // plain /admin, a goto to "/admin#invites" is a same-page hash change that keeps
      // the stale "0 of 1 joined" render (CI runs 36330965295 and 36332941618).
      await page.goto("/admin");
      await expect(
        page
          .getByTestId("invite-row")
          .filter({ hasText: "1 of 1 joined · no longer works" }),
      ).toHaveCount(1);
    });
  } finally {
    await removeMember(friend);
    // Only there if the check above failed.
    await removeMember(stranger);
  }
});

test("an invite's sign-in link opened in another browser is refused and leaves no account", async ({
  page,
  browser,
}) => {
  const friend = `elsewhere-${Date.now().toString(36)}@porchlight.local`;

  try {
    await withInviteOnlySite(page, async (makeLink) => {
      const path = await makeLink();

      // The browser that opened the invite asks for the link: Auth makes the user now.
      let link = "";
      await withFreshBrowser(browser, async (laptop) => {
        await laptop.goto(path);
        link = await signInLinkFor(friend, await askForLink(laptop, friend));
      });
      expect(await authUserExists(friend)).toBe(true);

      // Another device has no invite cookie: the sign-in is refused, the page says to
      // use the same browser, and the auth user is gone.
      await withFreshBrowser(browser, async (phone) => {
        await phone.goto(link);
        await phone.getByRole("button", { name: "Finish signing in" }).click();
        await expect(phone).toHaveURL(/\/auth\/sign-in-failed\?reason=sign-up-closed$/);
        await expect(phone.getByTestId("sign-in-failed-reason")).toContainText(
          "same browser as the invite link",
        );
        await expect(phone.getByTestId("session-handle")).toHaveCount(0);
      });
      expect(await authUserExists(friend)).toBe(false);

      // Nothing was spent: the link still lets the friend in.
      await page.goto("/admin");
      await expect(
        page.getByTestId("invite-row").filter({ hasText: "0 of 1 joined · works until" }),
      ).toHaveCount(1);
    });
  } finally {
    // Only there if a check above failed.
    await removeMember(friend);
  }
});
