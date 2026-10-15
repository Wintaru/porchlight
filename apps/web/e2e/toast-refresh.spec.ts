import { expect, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, fillBodyMarkdown, THEO } from "./helpers";

// A toast removes its query parameter from the address when it is dismissed. The next
// action that redirects to the same address must still show fresh data.

test("a second draft save after a dismissed toast shows the new title", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  await page.goto("/write");
  const stamp = Date.now().toString(36);
  const titles = [`Before ${stamp}`, `After ${stamp}`, `Last ${stamp}`];
  await fillBodyMarkdown(page, "A body.");
  for (const title of titles) {
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByTestId("form-status")).toHaveText("Saved.");
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page).toHaveURL(/\/write\/[0-9a-f-]+$/);
    await expect(page.getByLabel("Title")).toHaveValue(title);
  }
  await deleteCurrentPost(page);
});

test("a second unpublish after a dismissed toast shows the edited title", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  await page.goto("/write");
  const stamp = Date.now().toString(36);
  const first = `Unpublish twice ${stamp}`;
  const edited = `${first} edited`;
  await page.getByLabel("Title").fill(first);
  await page.getByLabel(/^Unlisted/).check();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(new RegExp(`/@theo/unpublish-twice-${stamp}$`));

  for (const title of [first, edited]) {
    await page.getByTestId("post-edit").click();
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByTestId("post-status")).toHaveText(/^Draft/);
    await expect(page.getByLabel("Title")).toHaveValue(title);
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page).toHaveURL(/\/write\/[0-9a-f-]+$/);
    if (title === first) {
      await page.getByLabel("Title").fill(edited);
      await page.getByRole("button", { name: "Publish" }).click();
      await expect(page).toHaveURL(new RegExp(`/@theo/unpublish-twice-${stamp}$`));
    }
  }
  await deleteCurrentPost(page);
});
