import { expect, type Page, test } from "@playwright/test";

import { AUTOSAVE_DELAY_MS } from "../src/components/editor/autosave-delay";
import { deleteCurrentPost, devSignIn, JUNE, THEO } from "./helpers";

// The issue #6 acceptance test: a post written in rich text, switched to markdown and
// back, saves the same `body_md`. Plus the rest of the Editor board: preview, autosave,
// the tag chips, the content note and the probation card. Runs against the seeded local
// stack (docs/setup/supabase.md); every post a test creates, it deletes at the end.
function modeButton(page: Page, mode: "Rich text" | "Markdown") {
  return page.getByRole("button", { name: mode, exact: true });
}

function tool(page: Page, name: string) {
  return page.getByRole("toolbar", { name: "Formatting" }).getByRole("button", { name });
}

test("rich text to markdown and back saves the same body_md", async ({ page }) => {
  await devSignIn(page, THEO);
  await page.goto("/write");
  const stamp = Date.now().toString(36);
  const title = `Sawhorse plan ${stamp}`;
  await page.getByLabel("Title").fill(title);

  // Written in rich text with the toolbar.
  const body = page.getByRole("textbox", { name: "Body", exact: true });
  await body.click();
  await page.keyboard.type("Two 2x4s and patience.");
  await page.keyboard.press("Enter");
  await tool(page, "Heading 2").click();
  await expect(tool(page, "Heading 2")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.type("The cut list");
  await page.keyboard.press("Enter");
  await expect(tool(page, "Heading 2")).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.type("Four legs at ");
  await tool(page, "Bold").click();
  await expect(tool(page, "Bold")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.type("30 inches");
  await tool(page, "Bold").click();
  await page.keyboard.type(" with a splay.");
  await expect(body.locator("h2")).toHaveText("The cut list");
  await expect(body.locator("strong")).toHaveText("30 inches");

  // Switched to markdown: the serializer's text, then a list added by hand.
  await modeButton(page, "Markdown").click();
  const markdown = page.getByLabel("Body (markdown)");
  const written =
    "Two 2x4s and patience.\n\n## The cut list\n\nFour legs at **30 inches** with a splay.";
  await expect(markdown).toHaveValue(written);
  await expect(tool(page, "Bold")).toBeDisabled();
  const expected = `${written}\n\n- one\n- two`;
  await markdown.fill(expected);

  // Back to rich text: the list is there. And back to markdown: the same text.
  await modeButton(page, "Rich text").click();
  await expect(body.locator("li")).toHaveCount(2);
  await expect(body.locator("li").first()).toHaveText("one");
  await modeButton(page, "Markdown").click();
  await expect(markdown).toHaveValue(expected);

  // The preview is the server's render of that same markdown.
  await page.getByRole("button", { name: "Preview" }).click();
  const preview = page.getByTestId("preview-body");
  await expect(preview.locator("h2")).toHaveText("The cut list");
  await expect(preview.locator("strong")).toHaveText("30 inches");
  await expect(preview.locator("li")).toHaveCount(2);
  await page
    .getByRole("dialog", { name: "Preview" })
    .getByRole("button", { name: "Close" })
    .click();

  // Saved, reloaded from the store, and still the same body_md.
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]+\?saved=draft$/);
  await expect(page.getByTestId("form-status")).toHaveText("Saved.");
  await modeButton(page, "Markdown").click();
  await expect(page.getByLabel("Body (markdown)")).toHaveValue(expected);
  await modeButton(page, "Rich text").click();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByTestId("form-status")).toHaveText("Saved.");
  await modeButton(page, "Markdown").click();
  await expect(page.getByLabel("Body (markdown)")).toHaveValue(expected);

  await deleteCurrentPost(page);
});

test("a link and an image go in by URL and come out as markdown", async ({ page }) => {
  await devSignIn(page, THEO);
  await page.goto("/write");
  await page.getByLabel("Title").fill(`Links ${Date.now().toString(36)}`);
  const body = page.getByRole("textbox", { name: "Body", exact: true });
  await body.click();
  await page.keyboard.type("Read the plan");
  await page.keyboard.press("Shift+Home");
  await tool(page, "Link").click();
  const linkDialog = page.getByRole("dialog", { name: "Add a link" });
  await linkDialog.getByLabel("URL").fill("https://example.com/plan");
  await linkDialog.getByRole("button", { name: "Set link" }).click();
  await expect(linkDialog).toBeHidden();
  await expect(body.getByRole("link", { name: "Read the plan" })).toHaveAttribute(
    "href",
    "https://example.com/plan",
  );
  // The cursor sits after the link once it is set.
  await page.keyboard.press("Enter");
  await tool(page, "Image").click();
  const imageDialog = page.getByRole("dialog", { name: "Add an image" });
  await imageDialog.getByLabel("URL").fill("https://example.com/porch.jpg");
  await imageDialog.getByLabel("Alt text").fill("the porch");
  await imageDialog.getByRole("button", { name: "Insert image" }).click();
  await expect(body.locator("img")).toHaveAttribute("alt", "the porch");

  await modeButton(page, "Markdown").click();
  await expect(page.getByLabel("Body (markdown)")).toHaveValue(
    "[Read the plan](https://example.com/plan)\n\n![the porch](https://example.com/porch.jpg)",
  );
  // The pause after the last keystroke saved a draft: wait for it, then delete it.
  await expect(page.getByTestId("save-state")).toHaveText("Draft saved a moment ago");
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]+$/);
  await page.reload();
  await deleteCurrentPost(page);
});

test("a pause saves the draft on its own, with the tags and the content note", async ({
  page,
}) => {
  await devSignIn(page, JUNE);
  await page.goto("/write");
  await expect(page.getByTestId("probation-note")).toContainText("You are a new member");
  const stamp = Date.now().toString(36);
  const title = `Trail notes ${stamp}`;
  await page.getByLabel("Title").fill(title);
  await page.getByRole("textbox", { name: "Body", exact: true }).click();
  await page.keyboard.type("Eleven miles.");
  await page.getByLabel("Add a tag").fill("hiking");
  await page.getByLabel("Add a tag").press("Enter");
  await expect(page.getByTestId("tag-chip")).toHaveText(["hiking"]);
  await page.getByLabel("Mark as mature (blurred until clicked)").check();

  await expect(page.getByTestId("save-state")).toHaveText("Draft saved a moment ago");
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]+$/);

  // A reload lands on the draft's own page with everything the timer saved.
  await page.reload();
  await expect(page.getByTestId("post-status")).toHaveText("Draft");
  await expect(page.getByLabel("Title")).toHaveValue(title);
  // The seeded tag is "Hiking": the store's name wins over the typed one.
  await expect(page.getByTestId("tag-chip")).toHaveText(["Hiking"]);
  await expect(page.getByLabel("Mark as mature (blurred until clicked)")).toBeChecked();
  await modeButton(page, "Markdown").click();
  await expect(page.getByLabel("Body (markdown)")).toHaveValue("Eleven miles.");

  // Publishing from the editor sends a probation member's post to the queue (D7).
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByTestId("post-status")).toHaveText("Waiting for approval");
  await expect(page.getByTestId("save-state")).toHaveCount(0);
  await deleteCurrentPost(page);
});

test("an untouched body is saved as it was loaded, and a published post does not autosave", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  await page.goto("/write");
  const stamp = Date.now().toString(36);
  const title = `Loose markdown ${stamp}`;
  await page.getByLabel("Title").fill(title);
  // Text the serializer would reshape if it ever ran over it.
  const loose = "Loose __bold__ and _italic_\n\n* star bullet";
  await modeButton(page, "Markdown").click();
  await page.getByLabel("Body (markdown)").fill(loose);
  // Unlisted, so the feed tests that run beside this one see the seed alone.
  await page.getByLabel(/^Unlisted/).check();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(new RegExp(`/@theo/loose-markdown-${stamp}$`));

  await page.goto("/write");
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByTestId("post-status")).toHaveText("Published");
  // A title edit on a published post shows unsaved changes and stays that way: no timer.
  await page.getByLabel("Title").fill(`${title} edited`);
  await expect(page.getByTestId("save-state")).toHaveText("Unsaved changes");
  await page.waitForTimeout(AUTOSAVE_DELAY_MS + 500);
  await expect(page.getByTestId("save-state")).toHaveText("Unsaved changes");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("form-status")).toHaveText("Saved.");
  await modeButton(page, "Markdown").click();
  await expect(page.getByLabel("Body (markdown)")).toHaveValue(loose);
  await deleteCurrentPost(page);
});
