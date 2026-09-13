import { expect, type Page } from "@playwright/test";

// Shared by every spec that signs in or writes a post. The members are the seeded ones
// (supabase/seed.sql): every one signs in locally with <handle>@porchlight.local and the
// password `porchlight`.
export interface SeedMember {
  readonly email: string;
  readonly handle: string;
}

export const THEO: SeedMember = { email: "theo@porchlight.local", handle: "theo" };
export const JUNE: SeedMember = { email: "june@porchlight.local", handle: "june" };
export const MIRA: SeedMember = { email: "mira@porchlight.local", handle: "mira" };
export const LAMPLIGHTER: SeedMember = {
  email: "lamplighter@porchlight.local",
  handle: "lamplighter",
};
const SEED_PASSWORD = "porchlight";

export async function devSignIn(page: Page, member: SeedMember): Promise<void> {
  await page.goto("/auth/dev-sign-in");
  await page.getByLabel("Email").fill(member.email);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in as this member" }).click();
  await expect(page.getByTestId("session-handle")).toHaveText(`@${member.handle}`);
}

// The body through the editor's markdown mode: the textarea is the same string the
// form submits, so a test writes exactly the `body_md` it expects.
export async function fillBodyMarkdown(page: Page, body: string): Promise<void> {
  await page.getByRole("button", { name: "Markdown", exact: true }).click();
  await page.getByLabel("Body (markdown)").fill(body);
}

// Deletes the post the editor page is showing. Every test that creates one ends here,
// so the seed is the same for the next run. Comments on the post go with it (D6).
export async function deleteCurrentPost(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/write\?deleted=1$/);
  await expect(page.getByTestId("form-status")).toHaveText("Deleted.");
}
