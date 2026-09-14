import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { devSignIn, LAMPLIGHTER } from "./helpers";

// Issue #16's Done-when: every public page passes an axe accessibility check and
// renders at 390px with no horizontal scroll, and changing `site_name` changes the
// home page's `<title>`. Runs against the seeded local stack (docs/setup/supabase.md).

const PUBLIC_PATHS = ["/", "/about", "/terms", "/code-of-conduct", "/@theo", "/t/making"];

for (const path of PUBLIC_PATHS) {
  test(`${path} has no automatically detectable accessibility violations`, async ({
    page,
  }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test(`${path} renders at 390px with no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}

test("changing the site name changes the home page's title", async ({ page }) => {
  await devSignIn(page, LAMPLIGHTER);
  await page.goto("/admin");
  const nameField = page.getByLabel("Site name");
  const original = await nameField.inputValue();
  const newName = `Porchtest ${Date.now().toString(36)}`;
  await nameField.fill(newName);
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page).toHaveURL(/\/admin\?done=saved$/);

  await page.goto("/");
  await expect(page).toHaveTitle(newName);

  // Cleanup: restore the site name so the seed reads the same for the next run.
  await page.goto("/admin");
  await page.getByLabel("Site name").fill(original);
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page).toHaveURL(/\/admin\?done=saved$/);
});
