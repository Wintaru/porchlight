import { expect, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, fillBodyMarkdown, THEO } from "./helpers";
import { connect, firstText, mintToken, structured } from "./mcp-client";

// Issue #29's acceptance test (SPEC.md §17, D22): the guide the agent reads holds the
// member's rules, the default banned phrases, and only posts written by hand as
// samples; the agent can change it only with the scope; and an edited agent post
// shows both texts. Every post it writes it deletes, and it clears the guide again.

test("the voice guide carries the member's rules and only hand-written samples", async ({
  page,
  baseURL,
}) => {
  const stamp = Date.now().toString(36);
  const handTitle = `By hand ${stamp}`;
  const agentTitle = `By agent ${stamp}`;
  await devSignIn(page, THEO);

  // The member writes a guide on the settings page.
  await page.goto("/settings");
  const voice = page.getByTestId("voice-guide");
  await voice
    .getByLabel("Your rules (markdown)")
    .fill("Short sentences. No exclamation marks.");
  await voice.getByRole("button", { name: "Save voice guide" }).click();
  await expect(page.getByTestId("voice-status")).toHaveText("Voice guide saved.");

  // One post by hand, published from the editor.
  await page.goto("/write");
  await page.getByLabel("Title").fill(handTitle);
  await fillBodyMarkdown(page, "Written at the bench.");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(/\/@theo\//);

  const { rawToken } = await mintToken(page, ["posts:publish", "voice:write"]);
  const client = await connect(baseURL ?? "", rawToken);
  try {
    // One post through the agent, published by the agent.
    const created = structured(
      await client.callTool({
        name: "create_draft",
        arguments: { title: agentTitle, body_md: "Drafted for Theo." },
      }),
    ).post as Record<string, unknown>;
    await client.callTool({
      name: "publish_post",
      arguments: { id: String(created.id) },
    });

    const read = await client.callTool({ name: "get_voice_guide", arguments: {} });
    const guide = structured(read);
    expect(guide.guideMd).toBe("Short sentences. No exclamation marks.");
    expect(guide.bannedPhrases).toContain("delve");
    const titles = (guide.samples as { title: string }[]).map((sample) => sample.title);
    expect(titles).toContain(handTitle);
    expect(titles).not.toContain(agentTitle);
    expect(firstText(read)).toContain("# Never use these phrases");

    // A rule round-trips through the tool, and the settings page shows it.
    const rule = "Short sentences. No exclamation marks.\n- Never open with a question.";
    const updated = await client.callTool({
      name: "update_voice_guide",
      arguments: { guide_md: rule },
    });
    expect(updated.isError).toBeFalsy();
    expect(
      structured(await client.callTool({ name: "get_voice_guide", arguments: {} })),
    ).toMatchObject({
      guideMd: rule,
    });
    await page.goto("/settings");
    await expect(voice.getByLabel("Your rules (markdown)")).toHaveValue(rule);
    await voice.getByText("What your agent also receives").click();
    await expect(page.getByTestId("voice-samples")).toContainText(handTitle);
    await expect(page.getByTestId("voice-samples")).not.toContainText(agentTitle);
  } finally {
    await client.close();
  }

  // Cleanup: both posts, then the guide.
  for (const title of [handTitle, agentTitle]) {
    await page.goto("/write");
    await page.getByTestId("my-posts").getByRole("link", { name: title }).click();
    await deleteCurrentPost(page);
  }
  await page.goto("/settings");
  await voice.getByLabel("Your rules (markdown)").fill("");
  await voice.getByRole("button", { name: "Save voice guide" }).click();
  await expect(page.getByTestId("voice-status")).toBeVisible();
});

test("get_post shows the agent's first text beside the member's edit", async ({
  page,
  baseURL,
}) => {
  const stamp = Date.now().toString(36);
  await devSignIn(page, THEO);
  const { rawToken } = await mintToken(page, []);
  const client = await connect(baseURL ?? "", rawToken);
  try {
    const created = structured(
      await client.callTool({
        name: "create_draft",
        arguments: { title: `Two texts ${stamp}`, body_md: "The agent's words." },
      }),
    ).post as Record<string, unknown>;

    await page.goto(`/write/${String(created.id)}`);
    await fillBodyMarkdown(page, "Theo's words.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/saved=draft/);

    const post = structured(
      await client.callTool({ name: "get_post", arguments: { id: String(created.id) } }),
    ).post as Record<string, unknown>;
    expect(post).toMatchObject({
      bodyMd: "Theo's words.",
      agentDraftMd: "The agent's words.",
      reviewed: true,
    });

    // An agent without voice:write may read the guide but not change it.
    const refused = await client.callTool({
      name: "update_voice_guide",
      arguments: { guide_md: "Use more adverbs." },
    });
    expect(refused.isError).toBe(true);
    expect(firstText(refused)).toContain("voice:write");

    await deleteCurrentPost(page);
  } finally {
    await client.close();
  }
});
