import { expect, type Page, type Route, test } from "@playwright/test";

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
  // The editor reads typed text back from the DOM a moment later and re-places the
  // cursor when it does, which wipes a keyboard selection made before that moment. No
  // person types that fast. The hidden field changes only once the text is in the
  // editor's own state, so it is the sync point, and a triple-click is a selection
  // the editor makes itself, at once, rather than one it copies from the browser.
  await expect(page.locator('input[name="bodyMd"]')).toHaveValue("Read the plan");
  await body.getByText("Read the plan").click({ clickCount: 3 });
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

test("typing a tag offers the site's public tags that match", async ({ page }) => {
  await devSignIn(page, THEO);
  await page.goto("/write");
  const box = page.getByLabel("Add a tag");
  const options = page
    .getByRole("listbox", { name: "Matching tags" })
    .getByRole("option");

  // "Making" is on a public post. "Mature" is the content note, never a suggestion.
  await box.fill("ma");
  await expect(options).toHaveText(["Making"]);
  await box.press("ArrowDown");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  await box.press("Enter");
  await expect(page.getByTestId("tag-chip")).toHaveText(["Making"]);
  await expect(box).toHaveValue("");
  await expect(options).toHaveCount(0);

  // Escape closes the list and keeps the text. A click picks one too, and a tag the
  // post has is not offered again.
  await box.fill("porch");
  await expect(options).toHaveText(["Porch talk"]);
  await box.press("Escape");
  await expect(options).toHaveCount(0);
  await expect(box).toHaveValue("porch");
  await box.fill("porc");
  await options.filter({ hasText: "Porch talk" }).click();
  await expect(page.getByTestId("tag-chip")).toHaveText(["Making", "Porch talk"]);
  await box.fill("ma");
  await expect(options).toHaveCount(0);

  // Enter with nothing highlighted adds the text as typed.
  await box.fill("xyz-no-such-tag");
  await expect(options).toHaveCount(0);
  await box.press("Enter");
  await expect(page.getByTestId("tag-chip")).toHaveText([
    "Making",
    "Porch talk",
    "xyz-no-such-tag",
  ]);
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

// A Save or Unpublish redirects back to the same editor. It shows the post as saved:
// the visibility just chosen, and a version the next autosave may write over. Unpublish
// waits while the page has changes it would not send.
test("after a Save and an Unpublish the editor shows the post as saved", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  await page.goto("/write");
  const stamp = Date.now().toString(36);
  await page.getByLabel("Title").fill(`Shown as saved ${stamp}`);
  await page.getByLabel(/^Unlisted/).check();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(new RegExp(`/@theo/shown-as-saved-${stamp}$`));
  await page.getByTestId("post-edit").click();

  // The status line is the server's render of the stored post.
  const saveAs = async (visibility: RegExp, status: string | RegExp) => {
    await page.getByLabel(visibility).check();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByTestId("post-status")).toHaveText(status);
    await expect(page.getByLabel(visibility)).toBeChecked();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  };
  await saveAs(/^Private/, /Only you/);
  await saveAs(/^Public/, /^Published$/);
  await saveAs(/^Private/, /Only you/);

  const unpublish = page.getByRole("button", { name: "Unpublish" });
  await page.getByLabel("Title").fill(`Shown as saved ${stamp} edited`);
  await expect(unpublish).toBeDisabled();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByLabel("Title")).toHaveValue(`Shown as saved ${stamp} edited`);
  await unpublish.click();
  await expect(page.getByTestId("post-status")).toHaveText(/^Draft/);
  await page.getByLabel("Title").fill(`Shown as saved ${stamp} again`);
  await expect(page.getByTestId("save-state")).toHaveText(/Saving|Draft saved/);
  await expect(page.getByTestId("save-state")).toHaveText("Draft saved a moment ago");
  await deleteCurrentPost(page);
});

// #104: a Save the server refuses comes back with its error. The page keeps what was
// typed, and Save works again once the problem is fixed.
test("after a refused Save the editor can save again", async ({ page }) => {
  await devSignIn(page, THEO);
  await page.goto("/write");
  const stamp = Date.now().toString(36);
  const title = `Refused once ${stamp}`;
  await page.getByLabel("Title").fill(title);
  await page.getByLabel(/^Unlisted/).check();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(new RegExp(`/@theo/refused-once-${stamp}$`));
  await page.getByTestId("post-edit").click();

  // The field's own limit stops a person; the server's check is what this exercises.
  const summary = page.getByLabel("Summary");
  await summary.evaluate((input) => {
    input.removeAttribute("maxlength");
  });
  await summary.fill("x".repeat(201));
  const save = page.getByRole("button", { name: "Save", exact: true });
  await page.getByLabel("Title").fill(`${title} edited`);
  await save.click();
  await expect(page.getByTestId("save-state")).toHaveText(/A summary is at most 200/);
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]+$/);
  await expect(summary).toHaveValue("x".repeat(201));
  await expect(page.getByLabel("Title")).toHaveValue(`${title} edited`);
  await expect(save).toBeEnabled();

  await summary.fill("Short now.");
  await save.click();
  await expect(page.getByTestId("form-status")).toHaveText("Saved.");
  await expect(summary).toHaveValue("Short now.");
  await expect(page.getByLabel("Title")).toHaveValue(`${title} edited`);
  await deleteCurrentPost(page);
});

// #66: the editor opens only for someone who may edit the post. June may read Theo's
// published post on its own page, but not open it here.
test("another member's published post does not open in the editor", async ({ page }) => {
  const SEED_PUBLIC_POST_ID = "00000000-0000-4000-8000-0000000000b2";
  await devSignIn(page, JUNE);
  const response = await page.goto(`/write/${SEED_PUBLIC_POST_ID}`);
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Nothing here" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);
});

// #100: the editor stops waiting for an autosave after 15 s, but the server call runs
// on. An autosave that reaches the store after a newer Save must not put the older
// body back, and the page that sent it must say the post changed.
test("a late autosave after a newer Save changes nothing and says so", async ({
  page,
  context,
}) => {
  await devSignIn(page, THEO);
  await page.goto("/write");
  const stamp = Date.now().toString(36);
  await page.getByLabel("Title").fill(`Race notes ${stamp}`);
  await modeButton(page, "Markdown").click();
  await page.getByLabel("Body (markdown)").fill("The first words.");
  await expect(page.getByTestId("save-state")).toHaveText("Draft saved a moment ago");
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]+$/);
  const editorPath = new URL(page.url()).pathname;

  // The next autosave from this tab is held on its way to the server.
  const marker = `stale-${stamp}`;
  const held: Route[] = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (
      request.method() === "POST" &&
      request.headers()["next-action"] !== undefined &&
      (request.postData() ?? "").includes(marker)
    ) {
      held.push(route);
      return;
    }
    await route.fallback();
  });
  await page.getByLabel("Body (markdown)").fill(`The older words, ${marker}.`);
  await expect(page.getByTestId("save-state")).toHaveText("Saving…");
  await expect.poll(() => held.length).toBe(1);

  // Meanwhile a newer Save lands, from a second tab.
  const other = await context.newPage();
  await other.goto(editorPath);
  await modeButton(other, "Markdown").click();
  await other.getByLabel("Body (markdown)").fill("The newer words.");
  await other.getByRole("button", { name: "Save draft" }).click();
  await expect(other.getByTestId("form-status")).toHaveText("Saved.");

  // Now the held autosave reaches the server.
  const late = held[0];
  if (late === undefined) {
    throw new Error("expected a held autosave");
  }
  const finished = page.waitForEvent("requestfinished", (r) => r === late.request());
  await late.continue();
  await finished;
  await expect(page.getByTestId("save-state")).toHaveText(
    /This post changed since you opened it/,
  );
  // The typed text stays on the page, for Save draft to keep.
  await expect(page.getByLabel("Body (markdown)")).toHaveValue(
    `The older words, ${marker}.`,
  );

  await other.reload();
  await modeButton(other, "Markdown").click();
  await expect(other.getByLabel("Body (markdown)")).toHaveValue("The newer words.");
  await page.close();
  await deleteCurrentPost(other);
});
