import { expect, test } from "@playwright/test";

import { devSignIn, JUNE, THEO } from "./helpers";
import { connect, firstText, mintToken, structured } from "./mcp-client";

// Issue #28's acceptance test (SPEC.md §17, D22): a real MCP client, a real token, and
// the draft it writes showing up in the member's editor.

test("an agent drafts through the door and the draft waits in the editor", async ({
  page,
  baseURL,
}) => {
  await devSignIn(page, THEO);
  const { rawToken } = await mintToken(page, ["posts:draft"]);
  const client = await connect(baseURL ?? "", rawToken);

  try {
    // The house rules reach the agent before it writes anything.
    expect(client.getInstructions() ?? "").toContain("Do not pad");

    const me = structured(await client.callTool({ name: "get_me", arguments: {} }));
    expect(me).toMatchObject({
      handle: "theo",
      scopes: ["posts:draft"],
      publishesAtOnce: true,
      limits: { draftsPerDay: 5, publishesPerDay: 2 },
    });

    const stamp = Date.now().toString(36);
    const title = `Agent draft ${stamp}`;
    const created = await client.callTool({
      name: "create_draft",
      arguments: { title, body_md: "Written from the author's notes.", tags: ["making"] },
    });
    expect(firstText(created)).toContain("waiting for theo");
    const post = structured(created).post as Record<string, unknown>;
    expect(post).toMatchObject({ status: "draft", origin: "agent", reviewed: false });

    // The list is an index: titles and status, no bodies.
    const listed = structured(
      await client.callTool({ name: "list_posts", arguments: { status: "draft" } }),
    ).posts as Record<string, unknown>[];
    const mine = listed.find((entry) => entry.id === post.id);
    expect(mine).toMatchObject({ title, status: "draft" });
    expect(mine).not.toHaveProperty("bodyMd");

    // The member sees it in the editor, badged as an agent draft nobody has read.
    await page.goto("/write");
    const row = page.getByTestId("post-row").filter({ hasText: title });
    await expect(row).toBeVisible();
    await expect(row.getByTestId("agent-draft-badge")).toBeVisible();

    // Publishing needs the scope this token does not have.
    const refused = await client.callTool({
      name: "publish_post",
      arguments: { id: String(post.id) },
    });
    expect(refused.isError).toBe(true);
    expect(firstText(refused)).toContain("Not allowed");

    // The member publishes from the editor, which marks the post reviewed.
    await page.goto(`/write/${String(post.id)}`);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page).toHaveURL(new RegExp(`/@theo/`));
    const published = structured(
      await client.callTool({ name: "get_post", arguments: { id: String(post.id) } }),
    ).post as Record<string, unknown>;
    expect(published).toMatchObject({
      status: "published",
      origin: "agent",
      reviewed: true,
    });

    // Cleanup: the post is the seed's only trace of this test.
    await page.goto(`/write/${String(post.id)}`);
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/write\?deleted=1$/);
  } finally {
    await client.close();
  }
});

test("the sixth draft of the day is refused with the cap named", async ({
  page,
  baseURL,
}) => {
  await devSignIn(page, JUNE);
  const { rawToken } = await mintToken(page, ["posts:draft"]);
  const client = await connect(baseURL ?? "", rawToken);
  const created: string[] = [];

  try {
    const stamp = Date.now().toString(36);
    for (let index = 1; index <= 5; index += 1) {
      const result = await client.callTool({
        name: "create_draft",
        arguments: { title: `Cap ${stamp} ${String(index)}`, body_md: "A note." },
      });
      expect(result.isError).toBeUndefined();
      created.push(String((structured(result).post as Record<string, unknown>).id));
    }

    const sixth = await client.callTool({
      name: "create_draft",
      arguments: { title: `Cap ${stamp} 6`, body_md: "One too many." },
    });

    expect(sixth.isError).toBe(true);
    expect(firstText(sixth)).toContain("Daily limit reached: 5");
    expect(firstText(sixth)).toContain("resets at");
  } finally {
    await client.close();
    // Cleanup: the five drafts, so the seed reads the same for the next run.
    for (const id of created) {
      await page.goto(`/write/${id}`);
      await page.getByRole("button", { name: "Delete" }).click();
      await expect(page).toHaveURL(/\/write\?deleted=1$/);
    }
  }
});

test("a revoked token is refused at the door", async ({ page, baseURL }) => {
  await devSignIn(page, THEO);
  const { rawToken, name } = await mintToken(page, ["posts:draft"]);

  await page.goto("/settings");
  await page
    .getByTestId("token-row")
    .filter({ hasText: name })
    .getByTestId("token-revoke")
    .click();
  await expect(page).toHaveURL(/\/settings\?agentRevoked=1$/);

  const response = await page.request.post(`${baseURL ?? ""}/api/mcp`, {
    headers: {
      Authorization: `Bearer ${rawToken}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    data: { jsonrpc: "2.0", id: 1, method: "tools/list" },
  });

  expect(response.status()).toBe(401);
});
