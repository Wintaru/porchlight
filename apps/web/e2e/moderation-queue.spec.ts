import { type Browser, expect, type Page, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, fillBodyMarkdown, JUNE, MIRA } from "./helpers";

// Every control on the queue that moderation.spec.ts does not already drive: the four
// filter tabs, a reject with no reason, and Hide, Remove and Escalate. A test that acts
// on an item acts on a post June writes for it, and June deletes it at the end, so the
// seeded queue is the same for the next test.

const SEED_PROBATION_POST = "First post, waiting for the light";
const SEED_ANONYMOUS_POST = "A note left on the step";
const SEED_PROBATION_COMMENT = "Can I see it sometime?";

async function queueAs(browser: Browser, filter = "all"): Promise<Page> {
  const page = await browser.newPage();
  await devSignIn(page, MIRA);
  await page.goto(`/mod/queue?filter=${filter}`);
  return page;
}

// June is on probation, so a post she publishes waits in the queue.
async function pendingPostByJune(browser: Browser, title: string): Promise<Page> {
  const author = await browser.newPage();
  await devSignIn(author, JUNE);
  await author.goto("/write");
  await author.getByLabel("Title").fill(title);
  await fillBodyMarkdown(author, "Written for a queue test.");
  await author.getByRole("button", { name: "Publish" }).click();
  await expect(author.getByTestId("post-status")).toHaveText("Waiting for approval");
  return author;
}

test("each filter tab narrows the queue and marks itself current", async ({
  browser,
}) => {
  const mod = await queueAs(browser);
  const items = mod.getByTestId("queue-item");
  await expect(mod.getByTestId("queue-filter-all")).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(items.filter({ hasText: SEED_PROBATION_POST })).toHaveCount(1);
  await expect(items.filter({ hasText: SEED_ANONYMOUS_POST })).toHaveCount(1);
  await expect(items.filter({ hasText: SEED_PROBATION_COMMENT })).toHaveCount(1);

  await mod.getByTestId("queue-filter-anonymous").click();
  await expect(mod).toHaveURL(/filter=anonymous$/);
  await expect(mod.getByTestId("queue-filter-anonymous")).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(mod.getByTestId("queue-filter-all")).not.toHaveAttribute("aria-current");
  await expect(items.filter({ hasText: SEED_ANONYMOUS_POST })).toHaveCount(1);
  for (const meta of await mod.getByTestId("queue-item-meta").allTextContents()) {
    expect(meta).toContain("anonymous");
  }

  await mod.getByTestId("queue-filter-probation").click();
  await expect(mod).toHaveURL(/filter=probation$/);
  await expect(items.filter({ hasText: SEED_PROBATION_POST })).toHaveCount(1);
  await expect(items.filter({ hasText: SEED_PROBATION_COMMENT })).toHaveCount(1);
  await expect(items.filter({ hasText: SEED_ANONYMOUS_POST })).toHaveCount(0);

  // The seed holds no flagged upload.
  await mod.getByTestId("queue-filter-flagged").click();
  await expect(mod).toHaveURL(/filter=flagged$/);
  await expect(mod.getByTestId("queue-empty")).toHaveText("Nothing waiting.");

  // A filter the page does not know falls back to all.
  await mod.goto("/mod/queue?filter=bogus");
  await expect(mod.getByTestId("queue-filter-all")).toHaveAttribute(
    "aria-current",
    "page",
  );
  await mod.close();
});

test("an item nobody escalated carries no escalated mark", async ({ browser }) => {
  const mod = await queueAs(browser, "probation");
  const item = mod.getByTestId("queue-item").filter({ hasText: SEED_PROBATION_POST });
  await expect(item).toHaveCount(1);
  await expect(item.getByTestId("queue-item-escalated")).toHaveCount(0);
  await mod.close();
});

test("a reject with no reason is refused in words and the item stays", async ({
  browser,
}) => {
  const mod = await queueAs(browser, "probation");
  const item = mod.getByTestId("queue-item").filter({ hasText: SEED_PROBATION_POST });
  await item.getByTestId("queue-reject").click();
  await expect(mod).toHaveURL(/error=reason-required$/);
  await expect(mod.getByTestId("queue-error")).toHaveText(
    "A rejection needs a reason. The author sees it.",
  );
  await mod.goto("/mod/queue?filter=probation");
  await expect(
    mod.getByTestId("queue-item").filter({ hasText: SEED_PROBATION_POST }),
  ).toHaveCount(1);
  await mod.close();
});

for (const action of [
  { button: "queue-hide", code: "hidden", status: "Hidden.", leaves: true },
  { button: "queue-remove", code: "removed", status: "Removed.", leaves: true },
  // Escalate asks for a senior look without deciding: the item stays pending.
  { button: "queue-escalate", code: "escalated", status: "Escalated.", leaves: false },
] as const) {
  test(`${action.status.replace(".", "")} does what it says to a pending post`, async ({
    browser,
  }) => {
    const title = `Queue ${action.code} ${Date.now().toString(36)}`;
    const author = await pendingPostByJune(browser, title);
    // One shared database and no retries: the post goes even when a step fails, or it
    // would sit in the queue under every test after this one.
    try {
      const mod = await queueAs(browser, "probation");
      const item = mod.getByTestId("queue-item").filter({ hasText: title });
      await item.getByLabel(/^Reason/).fill(`e2e ${action.code}`);
      await item.getByTestId(action.button).click();
      await expect(mod).toHaveURL(new RegExp(`done=${action.code}$`));
      await expect(mod.getByTestId("queue-status")).toHaveText(action.status);
      await expect(mod.getByTestId("queue-item").filter({ hasText: title })).toHaveCount(
        action.leaves ? 0 : 1,
      );
      if (!action.leaves) {
        // It stays in the queue, marked, so the next moderator knows it is waiting on
        // a senior decision (#49).
        await expect(
          mod
            .getByTestId("queue-item")
            .filter({ hasText: title })
            .getByTestId("queue-item-escalated"),
        ).toHaveText("escalated");
      }
      await mod.close();

      // The post never reached the public, whatever the moderator chose.
      const visitor = await browser.newPage();
      await visitor.goto("/");
      await expect(visitor.getByRole("link", { name: title })).toHaveCount(0);
      await visitor.close();
    } finally {
      await author.reload();
      await deleteCurrentPost(author);
      await author.close();
    }
  });
}
