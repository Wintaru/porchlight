import { expect, test } from "@playwright/test";

import { devSignIn, JUNE } from "./helpers";

// Issue #69: a save confirmation is a toast. It fades on its own, the dismiss button
// closes it early, and either way its `?saved=` code leaves the address so a reload
// does not show it again. The profile form is the example; every toast is the same
// component.
test("a save shows a toast that dismisses, comes back on the next save, and fades", async ({
  page,
}) => {
  await devSignIn(page, JUNE);
  await page.goto("/settings");
  const save = page.getByRole("button", { name: "Save", exact: true });
  const toast = page.getByTestId("form-status");

  await save.click();
  await expect(toast).toHaveText("Saved.");
  await expect(toast).toBeVisible();
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(toast).toHaveCount(0);
  await expect(page).toHaveURL(/\/settings$/);

  // The same page again: the toast must show a second time, not stay dismissed. The
  // pointer moves off, because hovering the toast holds it.
  await save.click();
  await expect(page).toHaveURL(/\/settings\?saved=1$/);
  await expect(toast).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(toast).toBeHidden({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/settings$/);

  await page.reload();
  await expect(toast).toHaveCount(0);

  // Back restores the page from the router's cache: a toast already shown stays gone.
  await save.click();
  await expect(page).toHaveURL(/\/settings\?saved=1$/);
  await page.mouse.move(0, 0);
  await expect(page).toHaveURL(/\/settings$/, { timeout: 10_000 });
  await page.getByRole("link", { name: "Write" }).first().click();
  await expect(page).toHaveURL(/\/write$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(toast).toHaveCount(0);
});
