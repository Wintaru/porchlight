import { expect, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, fillBodyMarkdown, THEO } from "./helpers";
import { rest } from "./service-rest";

// Issue #65: the evidence envelope reaches the real table. A write that fails is only
// logged (#61), so without this a schema change could stop text evidence while every
// other test stays green.

interface EvidenceRow {
  readonly sha256: string;
}

async function evidenceFor(kind: "post" | "comment", id: string): Promise<EvidenceRow[]> {
  const response = await rest(
    `submission_evidence?select=sha256&subject_kind=eq.${kind}&subject_id=eq.${id}`,
    { method: "GET" },
  );
  return (await response.json()) as EvidenceRow[];
}

async function deleteEvidence(kind: "post" | "comment", id: string): Promise<void> {
  await rest(`submission_evidence?subject_kind=eq.${kind}&subject_id=eq.${id}`, {
    method: "DELETE",
  });
}

test("a draft, its publish and a comment each leave an evidence row", async ({
  page,
}) => {
  const stamp = Date.now().toString(36);
  await devSignIn(page, THEO);

  await page.goto("/write");
  await page.getByLabel("Title").fill(`Evidence ${stamp}`);
  await fillBodyMarkdown(page, "First words.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]+\?saved=draft$/);
  const postId = /\/write\/([0-9a-f-]+)/.exec(page.url())?.[1] ?? "";
  expect(await evidenceFor("post", postId)).toHaveLength(1);

  // The publish hashes the text that goes out, not the first save.
  await fillBodyMarkdown(page, "The words that went out.");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(/\/@theo\//);
  const rows = await evidenceFor("post", postId);
  expect(rows).toHaveLength(2);
  expect(new Set(rows.map((row) => row.sha256)).size).toBe(2);

  let commentId: string | undefined;
  try {
    const body = `An evidence comment ${stamp}`;
    await page.getByTestId("comment-form").getByLabel("Your comment").fill(body);
    await page
      .getByTestId("comment-form")
      .getByRole("button", { name: "Comment" })
      .click();
    await expect(page.getByTestId("comment-notice")).toHaveText("Posted.");
    const found = await rest(
      `comments?select=id&body_md=eq.${encodeURIComponent(body)}`,
      {
        method: "GET",
      },
    );
    const [comment] = (await found.json()) as { id: string }[];
    expect(comment).toBeDefined();
    commentId = comment?.id;
    expect(await evidenceFor("comment", commentId ?? "")).toHaveLength(1);
  } finally {
    // The post takes its comment with it; the evidence rows are kept by design, so the
    // test removes its own.
    await page.goto(`/write/${postId}`);
    await deleteCurrentPost(page);
    await deleteEvidence("post", postId);
    if (commentId !== undefined) {
      await deleteEvidence("comment", commentId);
    }
  }
});
