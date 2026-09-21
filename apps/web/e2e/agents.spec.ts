import { expect, test } from "@playwright/test";

import { devSignIn, JUNE, THEO } from "./helpers";

// Issue #27's screen: a member mints a personal token on the settings page, sees it
// exactly once with the `claude mcp add` line, and revokes it (SPEC.md §17).

test("a member mints a token, sees it once, and revokes it", async ({ page }) => {
  await devSignIn(page, THEO);
  await page.goto("/settings");
  const agents = page.getByTestId("agents-section");
  await expect(agents).toBeVisible();

  const stamp = Date.now().toString(36);
  const form = agents.getByTestId("mint-token-form");
  await form.getByLabel("Token name").fill(`Laptop ${stamp}`);
  await form.getByLabel("Publish without you").check();
  await form.getByLabel("Expires").selectOption("30");
  await form.getByRole("button", { name: "Mint token" }).click();

  // The token shows once, with the one line that connects Claude Code.
  const minted = agents.getByTestId("minted-token");
  await expect(minted).toBeVisible();
  const rawToken = await minted.getByTestId("minted-token-value").innerText();
  expect(rawToken).toMatch(/^plt_[A-Za-z0-9_-]{43}$/);
  await expect(minted.getByTestId("mcp-add-line")).toContainText(
    `--header "Authorization: Bearer ${rawToken}"`,
  );
  await expect(minted.getByTestId("mcp-add-line")).toContainText("/api/mcp");

  // A reload shows the row, never the token again.
  await page.reload();
  await expect(page.getByTestId("minted-token")).toHaveCount(0);
  const row = page.getByTestId("token-row").filter({ hasText: `Laptop ${stamp}` });
  await expect(row).toContainText("posts:draft, posts:publish");
  await expect(row).toContainText("never used");
  await expect(row).toContainText("expires");
  await expect(page.getByText(rawToken)).toHaveCount(0);

  await row.getByTestId("token-revoke").click();
  await expect(page).toHaveURL(/\/settings\?agentRevoked=1$/);
  await expect(page.getByTestId("agent-status")).toHaveText("Token revoked.");
  const revoked = page.getByTestId("token-row").filter({ hasText: `Laptop ${stamp}` });
  await expect(revoked).toContainText("revoked");
  await expect(revoked.getByTestId("token-revoke")).toHaveCount(0);
});

test("a blank name is refused before anything is minted", async ({ page }) => {
  await devSignIn(page, JUNE);
  await page.goto("/settings");
  const form = page.getByTestId("mint-token-form");

  // The browser's `required` check would stop an empty submit; a whitespace name gets
  // past it and is the server's to refuse.
  await form.getByLabel("Token name").fill("   ");
  await form.getByRole("button", { name: "Mint token" }).click();

  await expect(page.getByTestId("mint-token-error")).toHaveText(
    "A token name is 1 to 60 characters.",
  );
  await expect(page.getByTestId("minted-token")).toHaveCount(0);
});
