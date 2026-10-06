import { expect, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, fillBodyMarkdown, THEO } from "./helpers";
import { connect, firstText, mintToken } from "./mcp-client";

// D32 (SPEC.md §17): with the opt-in posts:edit scope, a member's agent changes their
// published post. The change is live at once, kept in the history, and marked on the
// posts list and the post page until the member saves the post themselves.

test("an agent with posts:edit changes a published post, marked until Theo saves it", async ({
  page,
  browser,
  baseURL,
}) => {
  const title = `Agent edit ${Date.now().toString(36)}`;
  await devSignIn(page, THEO);
  await page.goto("/write");
  await page.getByLabel("Title").fill(title);
  await fillBodyMarkdown(page, "Theo wrote this line.");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(/\/@theo\/agent-edit-/);
  const postUrl = page.url();
  await page.getByTestId("post-edit").click();
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]+$/);
  const editor = page.url();
  const id = editor.split("/").pop() ?? "";

  try {
    const draftOnly = await mintToken(page, []);
    const refusedClient = await connect(baseURL ?? "", draftOnly.rawToken);
    try {
      const refused = await refusedClient.callTool({
        name: "update_draft",
        arguments: { id, body_md: "Not allowed." },
      });
      expect(refused.isError).toBe(true);
      expect(firstText(refused)).toContain("posts:edit");
    } finally {
      await refusedClient.close();
    }

    const editing = await mintToken(page, ["posts:edit"]);
    const client = await connect(baseURL ?? "", editing.rawToken);
    try {
      const changed = await client.callTool({
        name: "update_draft",
        arguments: { id, body_md: "The agent fixed this line." },
      });
      expect(changed.isError).toBeUndefined();

      // The words, never the audience.
      const moved = await client.callTool({
        name: "update_draft",
        arguments: { id, visibility: "unlisted" },
      });
      expect(moved.isError).toBe(true);
    } finally {
      await client.close();
    }

    const reader = await browser.newPage();
    await reader.goto(postUrl);
    await expect(reader.getByTestId("post-body")).toContainText(
      "The agent fixed this line.",
    );
    await expect(reader.getByTestId("agent-disclosure")).toHaveText(
      "Last changed by an assistant for @theo",
    );

    await page.goto("/write");
    const row = page.getByTestId("post-row").filter({ hasText: title });
    await expect(row.getByTestId("agent-edit-badge")).toBeVisible();
    await page.goto(`${editor}/history`);
    await expect(page.getByTestId("history-entry")).toHaveCount(1);

    // Theo reads it and saves: the mark goes.
    await page.goto(editor);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(/\?saved=/);
    await page.goto("/write");
    await expect(row).toBeVisible();
    await expect(row.getByTestId("agent-edit-badge")).toHaveCount(0);
    await reader.reload();
    await expect(reader.getByTestId("post-body")).toBeVisible();
    await expect(reader.getByTestId("agent-disclosure")).toHaveCount(0);
    await reader.close();
  } finally {
    await page.goto(editor);
    await deleteCurrentPost(page);
  }
});
