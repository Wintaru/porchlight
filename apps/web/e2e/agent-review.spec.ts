import { expect, type Page, test } from "@playwright/test";

import {
  deleteCurrentPost,
  devSignIn,
  fillBodyMarkdown,
  JUNE,
  LAMPLIGHTER,
  MIRA,
  THEO,
} from "./helpers";
import { connect, mintToken, structured } from "./mcp-client";

// Issue #30's acceptance test (SPEC.md §17, D22): an agent draft nobody has read is
// badged and warned about until a person saves it, the queue says where every post came
// from, and the post page's disclosure line follows the admin setting and the review.

async function setDisclosure(page: Page, value: "off" | "footer"): Promise<void> {
  await page.goto("/admin");
  await page.getByLabel("Agent disclosure").selectOption(value);
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByLabel("Agent disclosure")).toHaveValue(value);
}

test("an unread agent draft is badged and warned about until a person saves it", async ({
  page,
  baseURL,
}) => {
  const stamp = Date.now().toString(36);
  const title = `Unread draft ${stamp}`;
  await devSignIn(page, THEO);
  const { rawToken } = await mintToken(page, []);
  const client = await connect(baseURL ?? "", rawToken);
  let id = "";
  try {
    const created = structured(
      await client.callTool({
        name: "create_draft",
        arguments: { title, body_md: "The agent's first go." },
      }),
    ).post as Record<string, unknown>;
    id = String(created.id);
  } finally {
    await client.close();
  }

  await page.goto("/write");
  const row = page.getByTestId("post-row").filter({ hasText: title });
  await expect(row.getByTestId("agent-draft-badge")).toBeVisible();

  await page.goto(`/write/${id}`);
  await expect(page.getByTestId("agent-review-warning")).toBeVisible();
  // It warns; Publish is still there.
  await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();

  await fillBodyMarkdown(page, "Theo read it and changed a word.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/saved=draft/);
  await expect(page.getByTestId("agent-review-warning")).toHaveCount(0);
  await page.goto("/write");
  await expect(row).toBeVisible();
  await expect(row.getByTestId("agent-draft-badge")).toHaveCount(0);

  await page.goto(`/write/${id}`);
  await deleteCurrentPost(page);
});

test("the queue names an agent's post and badges it while unread", async ({
  page,
  browser,
  baseURL,
}) => {
  const stamp = Date.now().toString(36);
  const title = `Probation agent post ${stamp}`;
  // June is on probation: her agent's published post waits in the queue.
  await devSignIn(page, JUNE);
  const { rawToken } = await mintToken(page, ["posts:publish"]);
  const client = await connect(baseURL ?? "", rawToken);
  let id = "";
  try {
    const created = structured(
      await client.callTool({
        name: "create_draft",
        arguments: { title, body_md: "Drafted for June." },
      }),
    ).post as Record<string, unknown>;
    id = String(created.id);
    await client.callTool({ name: "publish_post", arguments: { id } });
  } finally {
    await client.close();
  }

  const mira = await browser.newPage();
  await devSignIn(mira, MIRA);
  await mira.goto("/mod/queue");
  const item = mira.getByTestId("queue-item").filter({ hasText: title });
  await expect(item.getByTestId("queue-agent-badge")).toHaveText(
    "agent draft, not yet reviewed",
  );
  await expect(item.getByTestId("queue-item-meta")).toContainText("drafted by an agent");
  const seeded = mira.getByTestId("queue-item").filter({ hasNotText: title }).first();
  await expect(seeded.getByTestId("queue-item-meta")).toContainText(
    /Post · written in the editor|Comment/,
  );

  await page.goto(`/write/${id}`);
  await deleteCurrentPost(page);
});

test("the disclosure line follows the setting and the review", async ({
  page,
  browser,
  baseURL,
}) => {
  const stamp = Date.now().toString(36);
  await devSignIn(page, THEO);
  const { rawToken } = await mintToken(page, ["posts:publish"]);
  const client = await connect(baseURL ?? "", rawToken);
  const posts: { id: string; slug: string }[] = [];
  const admin = await browser.newPage();
  try {
    for (const title of [`Unread by Theo ${stamp}`, `Edited by Theo ${stamp}`]) {
      const created = structured(
        await client.callTool({
          name: "create_draft",
          arguments: { title, body_md: "Drafted for Theo." },
        }),
      ).post as Record<string, unknown>;
      posts.push({ id: String(created.id), slug: String(created.slug) });
    }
    const [unread, edited] = posts;
    if (unread === undefined || edited === undefined) {
      throw new Error("expected two drafts");
    }
    await client.callTool({ name: "publish_post", arguments: { id: unread.id } });

    // Theo edits the second one and publishes it himself.
    await page.goto(`/write/${edited.id}`);
    await fillBodyMarkdown(page, "Theo's own words now.");
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page).toHaveURL(new RegExp(`/@theo/${edited.slug}$`));
    await expect(page.getByTestId("agent-disclosure")).toHaveText(
      "Drafted with an assistant, edited by @theo",
    );

    const reader = await browser.newPage();
    await reader.goto(`/@theo/${unread.slug}`);
    await expect(reader.getByTestId("agent-disclosure")).toHaveText(
      "Posted by an assistant for @theo",
    );

    await devSignIn(admin, LAMPLIGHTER);
    await setDisclosure(admin, "off");
    await reader.reload();
    await expect(reader.getByTestId("post-body")).toBeVisible();
    await expect(reader.getByTestId("agent-disclosure")).toHaveCount(0);
  } finally {
    await client.close();
    // The setting and the posts are shared with every later spec: put them back even
    // when an assertion above failed.
    if (admin.url().includes("/admin")) {
      await setDisclosure(admin, "footer");
    }
    for (const post of posts) {
      await page.goto(`/write/${post.id}`);
      await deleteCurrentPost(page);
    }
  }
});
