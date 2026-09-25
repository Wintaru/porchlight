import { type Browser, expect, type Page, test } from "@playwright/test";

import { deleteAuthUser } from "./auth-admin";
import { devSignIn, JUNE, LAMPLIGHTER, THEO } from "./helpers";
import { signInLinkFor } from "./mailbox";

// Issue #67: sign-in by a one-time email link, beside Google. The local stack sends the
// email to Mailpit, where the test reads the link.
//
// Each test asks for a link to its own address: Supabase Auth refuses a second link to
// the same address inside `max_frequency` (supabase/config.toml).

// The link is built from the local stack's Site URL, http://localhost:3000. A checkout
// that runs the suite on another port would follow it to a different server.
test.skip(
  (process.env.PORT ?? "3000") !== "3000",
  "The emailed link points at port 3000 (supabase/config.toml site_url).",
);

// Not in the seed: an address that has never signed in here.
const NEWCOMER = "newcomer@porchlight.local";

async function askForLink(page: Page, email: string, next: string): Promise<Date> {
  // Mailpit stamps to the second, so a message from this request is never older than
  // the start of the second it began in.
  const since = new Date(Math.floor(Date.now() / 1000) * 1000);
  await page.goto(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByTestId("sign-in-link-sent")).toBeVisible();
  return since;
}

// Follows the link in a browser with no cookies, the way a person on another device
// would, and hands the page to `check`.
async function inFreshBrowser(
  browser: Browser,
  check: (page: Page) => Promise<void>,
): Promise<void> {
  const context = await browser.newContext();
  try {
    await check(await context.newPage());
  } finally {
    await context.close();
  }
}

async function finishSigningIn(page: Page, link: string): Promise<void> {
  await page.goto(link);
  await page.getByRole("button", { name: "Finish signing in" }).click();
}

test("the header's Sign in opens a page with Google and the email link", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Email me a sign-in link" }),
  ).toBeVisible();
});

test("a member signs in by the emailed link and lands on the page asked for; the link works once", async ({
  page,
  browser,
}) => {
  const since = await askForLink(page, JUNE.email, "/settings");
  const link = await signInLinkFor(JUNE.email, since);

  // Opening the link alone signs nobody in: a mail scanner that opens it first must not
  // use it up.
  await page.goto(link);
  await expect(page.getByTestId("session-handle")).toHaveCount(0);
  await page.getByRole("button", { name: "Finish signing in" }).click();

  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByTestId("session-handle")).toHaveText(`@${JUNE.handle}`);

  await inFreshBrowser(browser, async (other) => {
    await finishSigningIn(other, link);
    await expect(other).toHaveURL(/\/auth\/sign-in-failed\?reason=link$/);
    await expect(other.getByTestId("sign-in-failed-reason")).toHaveText(
      /expired or was used/,
    );
    await expect(other.getByTestId("session-handle")).toHaveCount(0);
  });
});

test("a link opened in another browser signs in and lands on the home page", async ({
  page,
  browser,
}) => {
  const since = await askForLink(page, THEO.email, "/settings");
  const link = await signInLinkFor(THEO.email, since);

  await inFreshBrowser(browser, async (other) => {
    await finishSigningIn(other, link);
    await expect(other).toHaveURL(/localhost:\d+\/$/);
    await expect(other.getByTestId("session-handle")).toHaveText(`@${THEO.handle}`);
  });
});

test("a closed site refuses a new address the same as a new Google account", async ({
  page,
  browser,
}) => {
  await devSignIn(page, LAMPLIGHTER);
  await page.goto("/admin");
  try {
    await page.getByTestId("preset-just_me").click();
    await expect(page).toHaveURL(/\/admin\?done=saved$/);

    await inFreshBrowser(browser, async (visitor) => {
      // A new address gets the Confirm signup email (enable_confirmations is on).
      const since = await askForLink(visitor, NEWCOMER, "/");
      await finishSigningIn(visitor, await signInLinkFor(NEWCOMER, since));

      await expect(visitor).toHaveURL(/\/auth\/sign-in-failed\?reason=sign-up-closed$/);
      await expect(visitor.getByTestId("session-handle")).toHaveCount(0);
    });
  } finally {
    await page.getByTestId("preset-open_porch").click();
    await expect(page).toHaveURL(/\/admin\?done=saved$/);
    // The refused address still has an auth user with no profile. Remove it, so the
    // next run takes the new-address path again.
    await deleteAuthUser(NEWCOMER);
  }
});

test("an address that is not an email is refused on the form", async ({ page }) => {
  await page.goto("/auth/sign-in");
  // The browser's own check would stop the submit, so the form skips it.
  await page.locator("form", { has: page.getByLabel("Email") }).evaluate((form) => {
    form.setAttribute("novalidate", "");
  });
  await page.getByLabel("Email").fill("not an address");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();

  await expect(page.getByTestId("form-error")).toHaveText(/does not look like an email/);
});
