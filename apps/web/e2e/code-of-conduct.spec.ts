import { REPORT_REASONS } from "@porchlight/core";
import { expect, test } from "@playwright/test";

// Issue #17's Done-when: the report-reason list on the code of conduct page matches
// `REPORT_REASONS`, the single shared constant — and, since #40, the report form's own
// reason list, word for word.
test("the code of conduct page lists exactly the reasons in REPORT_REASONS", async ({
  page,
}) => {
  await page.goto("/code-of-conduct");

  const items = page.getByTestId("report-reasons").getByRole("listitem");
  await expect(items).toHaveCount(REPORT_REASONS.length);

  for (const reason of REPORT_REASONS) {
    await expect(page.getByTestId(`report-reason-${reason}`)).toBeVisible();
  }

  const listed = await items.allTextContents();
  await page.goto("/@theo/hello-from-the-porch");
  await page.getByTestId("post-report").click();
  await expect(
    page.getByTestId("report-reason").locator("option:not([disabled])"),
  ).toHaveText(listed);
});

test("the code of conduct page shows the configured region's reporting target", async ({
  page,
}) => {
  await page.goto("/code-of-conduct");

  await expect(page.getByTestId("region-reporting-target")).toBeVisible();
  await expect(page.getByTestId("region-ip-window")).toBeVisible();
});
