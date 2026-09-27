import { expect, type Page, test } from "@playwright/test";

import { devSignIn, LAMPLIGHTER } from "./helpers";

// Issue #74: the About text is written in the post editor, so an admin gets headings,
// bold, lists and links without markdown, and /about shows them.

function tool(page: Page, name: string) {
  return page.getByRole("toolbar", { name: "Formatting" }).getByRole("button", { name });
}

test("an admin formats the About text in the editor and /about shows it", async ({
  page,
}) => {
  await devSignIn(page, LAMPLIGHTER);
  await page.goto("/admin");
  const aboutField = page.locator('input[name="aboutMd"]');
  const original = await aboutField.inputValue();
  // The About field takes no images.
  await expect(tool(page, "Image")).toHaveCount(0);

  try {
    // Start from an empty body, in markdown mode, then write the rest in rich text.
    await page.getByRole("button", { name: "Markdown", exact: true }).click();
    await page.getByLabel("About (markdown)").fill("");
    await page.getByRole("button", { name: "Rich text", exact: true }).click();

    const body = page.getByRole("textbox", { name: "About", exact: true });
    await body.click();
    await tool(page, "Heading 2").click();
    await page.keyboard.type("Who we are");
    await page.keyboard.press("Enter");
    await page.keyboard.type("A porch for ");
    await tool(page, "Bold").click();
    await page.keyboard.type("friends");
    await tool(page, "Bold").click();
    await page.keyboard.press("Enter");
    await tool(page, "Bullet list").click();
    await page.keyboard.type("Newest first");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Read the rules");
    await expect(aboutField).toHaveValue(/Read the rules$/);
    await body.getByText("Read the rules").click({ clickCount: 3 });
    await tool(page, "Link").click();
    const linkDialog = page.getByRole("dialog", { name: "Add a link" });
    await linkDialog.getByLabel("URL").fill("https://example.com/rules");
    await linkDialog.getByRole("button", { name: "Set link" }).click();
    await expect(linkDialog).toBeHidden();

    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page).toHaveURL(/\/admin\?done=saved$/);

    await page.goto("/about");
    const about = page.getByTestId("about-body");
    await expect(about.locator("h2")).toHaveText("Who we are");
    await expect(about.locator("strong")).toHaveText("friends");
    await expect(about.locator("li")).toHaveCount(2);
    await expect(about.getByRole("link", { name: "Read the rules" })).toHaveAttribute(
      "href",
      "https://example.com/rules",
    );
  } finally {
    // Put the seeded text back: other tests read the same site_config.
    await page.goto("/admin");
    await page.getByRole("button", { name: "Markdown", exact: true }).click();
    await page.getByLabel("About (markdown)").fill(original);
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page).toHaveURL(/\/admin\?done=saved$/);
  }
});
