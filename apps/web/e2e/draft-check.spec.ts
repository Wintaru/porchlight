import { expect, test } from "@playwright/test";

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
    const clean = await client.callTool({
      name: "check_draft",
      arguments: { body_md: CLEAN },
    });
    expect(firstText(clean)).toBe("No warnings.");
  } finally {
    await client.close();
  }
});
