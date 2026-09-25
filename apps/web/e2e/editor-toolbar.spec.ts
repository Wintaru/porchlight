import { expect, type Page, test } from "@playwright/test";

import { devSignIn, THEO } from "./helpers";

// Every control on the Editor board that editor.spec.ts does not already drive: each
// formatting button, the disabled state of a command that cannot run, the tag chips'
// remove button and Backspace. No test here types a title, so the autosave timer never
// fires and nothing is written to the store: the hidden `bodyMd` field is the result.
function tool(page: Page, name: string) {
  return page
    .getByRole("toolbar", { name: "Formatting" })
    .getByRole("button", { name, exact: true });
}

function bodyMd(page: Page) {
  return page.locator('input[name="bodyMd"]');
}

async function openBlankEditor(page: Page) {
  await devSignIn(page, THEO);
  await page.goto("/write");
  const body = page.getByRole("textbox", { name: "Body", exact: true });
  await body.click();
  return body;
}

test("every formatting button writes the markdown it names", async ({ page }) => {
  const body = await openBlankEditor(page);

  // Inline marks, each switched on, typed through, and switched off.
  await page.keyboard.type("Plain ");
  await tool(page, "Bold").click();
  await page.keyboard.type("loud");
  await tool(page, "Bold").click();
  await page.keyboard.type(" ");
  await tool(page, "Italic").click();
  await expect(tool(page, "Italic")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.type("soft");
  await tool(page, "Italic").click();
  await page.keyboard.type(" ");
  await tool(page, "Code").click();
  await page.keyboard.type("x = 1");
  await tool(page, "Code").click();
  await expect(bodyMd(page)).toHaveValue("Plain **loud** *soft* `x = 1`");

  // H3, then back to a paragraph with Enter.
  await page.keyboard.press("Enter");
  await tool(page, "Heading 3").click();
  await expect(tool(page, "Heading 3")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.type("Small heading");
  await page.keyboard.press("Enter");
  await expect(tool(page, "Heading 3")).toHaveAttribute("aria-pressed", "false");

  // A quote, lifted out again with the same button.
  await tool(page, "Quote").click();
  await expect(tool(page, "Quote")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.type("Quoted line");
  await page.keyboard.press("Enter");
  await tool(page, "Quote").click();
  await expect(tool(page, "Quote")).toHaveAttribute("aria-pressed", "false");

  // A numbered list; an Enter on an empty item leaves the list.
  await tool(page, "Numbered list").click();
  await expect(tool(page, "Numbered list")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.type("first");
  await page.keyboard.press("Enter");
  await page.keyboard.type("second");
  // Quote cannot wrap a list item: the button says so instead of doing nothing.
  await expect(tool(page, "Quote")).toBeDisabled();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(tool(page, "Numbered list")).toHaveAttribute("aria-pressed", "false");
  await expect(tool(page, "Quote")).toBeEnabled();

  // A code block: marks cannot apply inside one.
  await tool(page, "Code block").click();
  await expect(tool(page, "Code block")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.type("let a = 1");
  await expect(tool(page, "Bold")).toBeDisabled();
  await expect(tool(page, "Italic")).toBeDisabled();

  await expect(bodyMd(page)).toHaveValue(
    [
      "Plain **loud** *soft* `x = 1`",
      "### Small heading",
      "> Quoted line",
      "1. first\n2. second",
      "```\nlet a = 1\n```",
    ].join("\n\n"),
  );
  // The rich view spaces list items like the post does, not a paragraph apart.
  await expect(body.locator("li > p").first()).toHaveCSS("margin-bottom", "0px");
});

test("an Enter after a heading adds nothing to body_md", async ({ page }) => {
  await openBlankEditor(page);
  await page.keyboard.type("Intro");
  await page.keyboard.press("Enter");
  await tool(page, "Heading 2").click();
  await page.keyboard.type("Section");
  await page.keyboard.press("Enter");
  await tool(page, "Bullet list").click();
  await page.keyboard.type("item");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  // Blank paragraphs at the end are where the cursor rests, not content: no `&nbsp;`.
  await expect(bodyMd(page)).toHaveValue("Intro\n\n## Section\n\n- item");
});

test("a tag chip goes with its × button or with Backspace in an empty box", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  await page.goto("/write");
  const box = page.getByLabel("Add a tag");
  for (const tag of ["alpha", "beta", "gamma"]) {
    await box.fill(tag);
    await box.press("Enter");
  }
  const chips = page.getByTestId("tag-chip");
  await expect(chips).toHaveText(["alpha", "beta", "gamma"]);
  await expect(page.locator('input[name="tags"]')).toHaveValue("alpha, beta, gamma");

  await page.getByRole("button", { name: "Remove tag beta" }).click();
  await expect(chips).toHaveText(["alpha", "gamma"]);

  await box.press("Backspace");
  await expect(chips).toHaveText(["alpha"]);
  await expect(page.locator('input[name="tags"]')).toHaveValue("alpha");

  // A duplicate is not added twice.
  await box.fill("alpha");
  await box.press("Enter");
  await expect(chips).toHaveText(["alpha"]);
});

test("the markdown view disables every formatting button and keeps the text", async ({
  page,
}) => {
  await openBlankEditor(page);
  await page.keyboard.type("Some words");
  await page.getByRole("button", { name: "Markdown", exact: true }).click();
  for (const name of ["Bold", "Italic", "Heading 2", "Quote", "Link", "Image"]) {
    await expect(tool(page, name)).toBeDisabled();
  }
  await expect(page.getByLabel("Body (markdown)")).toHaveValue("Some words");
  await page.getByRole("button", { name: "Rich text", exact: true }).click();
  await expect(tool(page, "Link")).toBeEnabled();
});

test("Link and Image are disabled inside code, where they cannot apply (#52)", async ({
  page,
}) => {
  await openBlankEditor(page);
  await expect(tool(page, "Link")).toBeEnabled();
  await expect(tool(page, "Image")).toBeEnabled();

  await tool(page, "Code block").click();
  await page.keyboard.type("const x = 1;");
  await expect(tool(page, "Link")).toBeDisabled();
  await expect(tool(page, "Image")).toBeDisabled();

  // Out of the block, both come back.
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(tool(page, "Link")).toBeEnabled();
  await expect(tool(page, "Image")).toBeEnabled();
});
