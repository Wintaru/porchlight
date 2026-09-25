import { expect, type Page, test } from "@playwright/test";

import { devSignIn, LAMPLIGHTER, MIRA, THEO } from "./helpers";

// Issue #46: the header on the Main board. The section links mark the current page,
// the account menu holds what the bar has no room for and the staff links a role
// allows, the bell's panel floats over the page, and on a phone the section links move
// into a menu. Nothing here writes to the store.

const PHONE = { width: 390, height: 844 } as const;

function banner(page: Page) {
  return page.getByRole("banner");
}

async function openAccountMenu(page: Page) {
  await page.getByTestId("account-menu").click();
  await expect(page.getByTestId("account-menu")).toHaveAttribute("aria-expanded", "true");
}

test("the section links go where they say and mark the current one", async ({ page }) => {
  await page.goto("/");
  const site = banner(page).getByRole("navigation", { name: "Site" });
  await expect(site.getByRole("link", { name: "Home" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await site.getByRole("link", { name: "Tags" }).click();
  await expect(page).toHaveURL(/\/tags$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tags");
  await expect(site.getByRole("link", { name: "Tags" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(site.getByRole("link", { name: "Home" })).not.toHaveAttribute(
    "aria-current",
  );

  // A tag's own page counts as Tags.
  await page.getByRole("main").getByRole("link", { name: "Making" }).click();
  await expect(page).toHaveURL(/\/t\/making$/);
  await expect(site.getByRole("link", { name: "Tags" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await site.getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(site.getByRole("link", { name: "About" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await site.getByRole("link", { name: "Porchlight" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("a member's account menu holds profile, settings and sign-out, and no staff links", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  await openAccountMenu(page);
  const menu = banner(page).getByRole("navigation", { name: "Account" });
  await expect(
    page.getByTestId("account-menu-panel").getByText("@theo", { exact: true }),
  ).toBeVisible();
  await expect(menu.getByRole("link", { name: "Moderation queue" })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Site settings" })).toHaveCount(0);

  await menu.getByRole("link", { name: "Your profile" }).click();
  await expect(page).toHaveURL(/\/@theo$/);
  // Moving to another page closes the menu.
  await expect(page.getByTestId("account-menu")).toHaveAttribute(
    "aria-expanded",
    "false",
  );

  await openAccountMenu(page);
  await menu.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

for (const staff of [
  { member: MIRA, links: ["Moderation queue"], absent: ["Site settings"] },
  { member: LAMPLIGHTER, links: ["Moderation queue", "Site settings"], absent: [] },
] as const) {
  test(`@${staff.member.handle}'s menu links to the staff pages the role allows`, async ({
    page,
  }) => {
    await devSignIn(page, staff.member);
    await openAccountMenu(page);
    const menu = banner(page).getByRole("navigation", { name: "Account" });
    for (const name of staff.absent) {
      await expect(menu.getByRole("link", { name })).toHaveCount(0);
    }
    for (const name of staff.links) {
      if (!(await menu.getByRole("link", { name }).isVisible())) {
        await openAccountMenu(page);
      }
      await menu.getByRole("link", { name }).click();
      await expect(page).toHaveURL(
        name === "Moderation queue" ? /\/mod\/queue$/ : /\/admin$/,
      );
    }
  });
}

test("the account menu closes with Escape, handing focus back, or a click away", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  const button = page.getByTestId("account-menu");
  await openAccountMenu(page);
  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();

  await openAccountMenu(page);
  await page.getByRole("main").click({ position: { x: 5, y: 5 } });
  await expect(button).toHaveAttribute("aria-expanded", "false");
});

test("the bell's panel floats over the page instead of growing the header", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  const before = await banner(page).boundingBox();
  await page.getByTestId("notification-bell").click();
  await expect(page.getByRole("region", { name: "Notifications" })).toBeVisible();
  const after = await banner(page).boundingBox();
  expect(before).not.toBeNull();
  expect(after?.height).toBe(before?.height);
});

test("on a phone a member finds the section links in the account menu", async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await devSignIn(page, THEO);
  const site = banner(page).getByRole("navigation", { name: "Site" });
  await expect(site.getByRole("link", { name: "Tags" })).toBeHidden();
  // Write keeps its name with only the plus sign showing.
  await expect(banner(page).getByRole("link", { name: "Write" })).toBeVisible();

  await openAccountMenu(page);
  const menu = banner(page).getByRole("navigation", { name: "Account" });
  await menu.getByRole("link", { name: "Tags" }).click();
  await expect(page).toHaveURL(/\/tags$/);
});

test("on a phone a visitor finds the section links and their activity in the Menu", async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await page.goto("/");
  await expect(banner(page).getByRole("link", { name: "Sign in" })).toBeVisible();
  const menuButton = page.getByTestId("visitor-menu");
  await menuButton.click();
  const menu = banner(page).getByRole("navigation", { name: "Account" });
  await expect(menu.getByRole("link", { name: "About" })).toBeVisible();
  await menu.getByRole("link", { name: "Your anonymous activity" }).click();
  await expect(page).toHaveURL(/\/anon$/);
});

test("a visitor on a desktop has no Menu button: every link is on the bar", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("visitor-menu")).toBeHidden();
  await expect(
    banner(page).getByRole("link", { name: "Your anonymous activity" }),
  ).toBeVisible();
});

test("the tags page lists every public tag, each linking to its own page", async ({
  page,
}) => {
  await page.goto("/tags");
  const tags = page.getByRole("main").getByRole("link");
  // "Hiking" is on a pending post only, so it is not listed (#53).
  await expect(tags).toHaveText(["Making", "Porch talk"]);
  await page.getByRole("main").getByRole("link", { name: "Porch talk" }).click();
  await expect(page).toHaveURL(/\/t\/porch-talk$/);
});

test("a menu left by a link stays closed on the way back", async ({ page }) => {
  await devSignIn(page, THEO);
  await page.goto("/");
  await openAccountMenu(page);
  await page.getByRole("link", { name: "Your profile" }).click();
  await expect(page).toHaveURL(/\/@theo$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("account-menu")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.getByTestId("account-menu-panel")).toBeHidden();
});

test("a link to the page already open still closes the menu", async ({ page }) => {
  await devSignIn(page, THEO);
  await page.goto("/settings");
  await openAccountMenu(page);
  await page
    .getByTestId("account-menu-panel")
    .getByRole("link", { name: "Settings" })
    .click();
  await expect(page.getByTestId("account-menu")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("tabbing from the open bell to the account menu closes the bell", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  const bell = page.getByTestId("notification-bell");
  await bell.focus();
  await page.keyboard.press("Enter");
  await expect(bell).toHaveAttribute("aria-expanded", "true");
  await page.getByTestId("account-menu").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("account-menu")).toHaveAttribute("aria-expanded", "true");
  await expect(bell).toHaveAttribute("aria-expanded", "false");
});
