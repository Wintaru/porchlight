import { expect, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, fillBodyMarkdown, THEO } from "./helpers";

// Issue #77: a fenced block that names its language shows coloured code, in light and
// dark mode; a plain block stays plain; the editor keeps the language on a round trip.

const BODY = [
  "```ts",
  "const answer: number = 42;",
  "```",
  "",
  "```sql",
  "select id from posts;",
  "```",
  "",
  "```bash",
  'echo "hi"',
  "```",
  "",
  "```",
  "plain text block",
  "```",
].join("\n");

test("code blocks with a language are coloured, and the editor keeps the language", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  await page.goto("/write");
  const stamp = Date.now().toString(36);
  await page.getByLabel("Title").fill(`Code ${stamp}`);
  await fillBodyMarkdown(page, BODY);
  // Through the rich view and back: the fences keep their languages.
  await page.getByRole("button", { name: "Rich text", exact: true }).click();
  await page.getByRole("button", { name: "Markdown", exact: true }).click();
  await expect(page.getByLabel("Body (markdown)")).toHaveValue(BODY);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(new RegExp(`/@theo/code-${stamp}$`));

  const body = page.getByTestId("post-body");
  for (const language of ["ts", "sql", "bash"]) {
    await expect(body.locator(`code.language-${language} span`).first()).toBeVisible();
  }
  const keyword = body.locator("code.language-ts .hljs-keyword").first();
  const plain = body.locator("pre code:not([class])");
  await expect(plain).toHaveText("plain text block\n");
  await expect(plain.locator("span")).toHaveCount(0);
  const lightColour = await keyword.evaluate(
    (element) => getComputedStyle(element).color,
  );
  const plainColour = await plain.evaluate((element) => getComputedStyle(element).color);
  expect(lightColour).not.toBe(plainColour);

  await page.emulateMedia({ colorScheme: "dark" });
  const darkColour = await keyword.evaluate((element) => getComputedStyle(element).color);
  expect(darkColour).not.toBe(lightColour);
  await page.emulateMedia({ colorScheme: "light" });

  // Open the published post in the editor and save it again: the fences survive.
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Markdown", exact: true }).click();
  await expect(page.getByLabel("Body (markdown)")).toHaveValue(BODY);

  await deleteCurrentPost(page);
});
