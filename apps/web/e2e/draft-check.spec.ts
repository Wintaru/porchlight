import { expect, type Page, type Route, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, fillBodyMarkdown, THEO } from "./helpers";
import { connect, firstText, mintToken, structured } from "./mcp-client";

// The draft check (#32): the editor's Check button and the check_draft tool give the
// same warnings from the same Manager query.
const SLOP = `Let's dive in to the rich tapestry of porch life.

In conclusion, the porch is a testament to what people can build together.`;
const CLEAN =
  "I fixed the porch step on Sunday. It took three tries, and the third board fit.";

test("the editor's Check button warns about slop and passes clean text", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  await page.goto("/write");
  const dialog = page.getByRole("dialog", { name: "Check" });

  await fillBodyMarkdown(page, SLOP);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  const warnings = page.getByTestId("draft-check-warnings");
  await expect(warnings).toContainText('"tapestry" is on the banned list.');
  await expect(warnings).toContainText("sums up");
  await dialog.getByRole("button", { name: "Close" }).click();

  await page.getByLabel("Body (markdown)").fill(CLEAN);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(page.getByTestId("draft-check-clear")).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();

  // Autosave may have made a draft of the untitled post; the seed keeps none.
  if (/\/write\/[0-9a-f-]+/.test(page.url())) {
    await deleteCurrentPost(page);
  }
});

// Holds each server action that sends this body text until the test lets it go, so a
// test can make an answer arrive late. Other calls, such as the upload list the editor
// loads, go through.
async function holdServerActions(page: Page, marker: string): Promise<Route[]> {
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
  return held;
}

// Lets one held answer through and waits until the page has it.
async function release(page: Page, route: Route | undefined): Promise<void> {
  if (route === undefined) {
    throw new Error("expected a held server action");
  }
  const finished = page.waitForEvent("requestfinished", (r) => r === route.request());
  await route.continue();
  await finished;
}

// #91: only the newest Check or Preview answer shows, and an answer that arrives after
// Close never opens the dialog again.
test("a late Check or Preview answer never reopens or overwrites the dialog", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  await page.goto("/write");
  await expect(page.getByTestId("attachment-drop")).toBeVisible();
  const held = await holdServerActions(page, "porch");
  const cases = [
    {
      name: "Check",
      waiting: "Checking…",
      newest: page.getByTestId("draft-check-clear"),
      stale: page.getByTestId("draft-check-warnings"),
    },
    {
      name: "Preview",
      waiting: "Rendering…",
      newest: page.getByTestId("preview-body").getByText("third board fit"),
      stale: page.getByTestId("preview-body").getByText("tapestry"),
    },
  ];
  for (const { name, waiting, newest, stale } of cases) {
    const button = page.getByRole("button", { name, exact: true });
    const dialog = page.getByRole("dialog", { name });
    const close = dialog.getByRole("button", { name: "Close" });

    // Two requests in a row. Next.js sends server actions one at a time, so the second
    // goes out only when the first has answered: by then the page has dealt with the
    // first answer, and it must not show.
    await fillBodyMarkdown(page, SLOP);
    await button.click();
    await expect.poll(() => held.length).toBe(1);
    const first = held.pop();
    await close.click();
    await page.getByLabel("Body (markdown)").fill(CLEAN);
    await button.click();
    await release(page, first);
    await expect.poll(() => held.length).toBe(1);
    await expect(dialog.getByText(waiting)).toBeVisible();
    await expect(stale).toHaveCount(0);
    await release(page, held.pop());
    await expect(newest).toBeVisible();
    await expect(stale).toHaveCount(0);
    await close.click();
    await expect(dialog).toBeHidden();

    // Closed while it waits: the answer arrives and the dialog stays closed.
    await button.click();
    await expect(dialog).toBeVisible();
    await expect.poll(() => held.length).toBe(1);
    const late = held.pop();
    await close.click();
    await expect(dialog).toBeHidden();
    await release(page, late);
    await page.waitForTimeout(500);
    await expect(dialog).toBeHidden();
  }
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("check_draft gives an agent the same warnings", async ({ page, baseURL }) => {
  await devSignIn(page, THEO);
  const { rawToken } = await mintToken(page, ["posts:draft"]);
  const client = await connect(baseURL ?? "", rawToken);
  try {
    expect(client.getInstructions() ?? "").toContain("check_draft");
    const slop = await client.callTool({
      name: "check_draft",
      arguments: { body_md: SLOP },
    });
    expect(firstText(slop)).toContain('"tapestry" is on the banned list.');
    expect(structured(slop).warnings).toContainEqual(
      expect.objectContaining({ kind: "closing-summary", opening: "in conclusion" }),
    );
    // #97: the closing "In conclusion" is named once, as the summary.
    expect(structured(slop).warnings).not.toContainEqual(
      expect.objectContaining({ kind: "banned-phrase", phrase: "in conclusion" }),
    );
    const clean = await client.callTool({
      name: "check_draft",
      arguments: { body_md: CLEAN },
    });
    expect(firstText(clean)).toBe("No warnings.");
  } finally {
    await client.close();
  }
});
