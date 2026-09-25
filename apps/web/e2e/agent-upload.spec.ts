import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { deleteCurrentPost, devSignIn, THEO } from "./helpers";
import { connect, firstText, mintToken, structured } from "./mcp-client";

// Issue #31's acceptance test (SPEC.md §6, §7, §17): an agent uploads through the
// signed URL, the fake scanner clears the file, and its URL renders in a published post;
// an SVG renamed to .png is refused at finalize. (The locked path is the core's
// FinalizeUploadHandler test and media-tools.test.ts: a lock cannot be undone, so an
// end-to-end run would leave a retained file behind on every run.)

const PHOTO = readFileSync(join(import.meta.dirname, "fixtures", "porch-photo.jpg"));
const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>',
);

// Does what the curl line does, from the test: the bytes go straight to storage.
async function put(curl: string, uploadUrl: string, bytes: Buffer, type: string) {
  const anonKey = /apikey: ([^"]+)"/.exec(curl)?.[1] ?? "";
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      "content-type": type,
      "x-upsert": "false",
    },
    body: new Uint8Array(bytes),
  });
  expect(response.ok).toBe(true);
}

test("an agent uploads a photo through the signed URL and it shows in the post", async ({
  page,
  baseURL,
}) => {
  const stamp = Date.now().toString(36);
  const filename = `agent-photo-${stamp}.jpg`;
  const title = `Agent photo ${stamp}`;
  await devSignIn(page, THEO);
  const { rawToken } = await mintToken(page, ["media:upload"]);
  const client = await connect(baseURL ?? "", rawToken);
  let postId = "";
  try {
    const issued = structured(
      await client.callTool({
        name: "request_upload",
        arguments: { filename, bytes: PHOTO.length },
      }),
    );
    await put(String(issued.curl), String(issued.uploadUrl), PHOTO, "image/jpeg");

    const finalized = await client.callTool({
      name: "finalize_upload",
      arguments: { media_id: String(issued.mediaId), filename },
    });
    const upload = structured(finalized).upload as Record<string, unknown>;
    expect(upload).toMatchObject({ status: "ready" });
    expect(String(upload.url)).toContain("/storage/v1/object/public/public-media/");
    expect(firstText(finalized)).toContain("Put this in the draft");

    const again = structured(
      await client.callTool({
        name: "get_media",
        arguments: { id: String(issued.mediaId) },
      }),
    ).upload as Record<string, unknown>;
    expect(again).toMatchObject({ status: "ready", url: upload.url });

    const drafted = structured(
      await client.callTool({
        name: "create_draft",
        arguments: {
          title,
          body_md: `The porch this morning.\n\n${String(upload.markdown)}`,
        },
      }),
    ).post as Record<string, unknown>;
    postId = String(drafted.id);

    // An SVG with a .png name never gets past finalize.
    const disguised = `disguised-${stamp}.png`;
    const svgIssued = structured(
      await client.callTool({
        name: "request_upload",
        arguments: { filename: disguised, bytes: SVG.length },
      }),
    );
    await put(String(svgIssued.curl), String(svgIssued.uploadUrl), SVG, "image/png");
    const refused = await client.callTool({
      name: "finalize_upload",
      arguments: { media_id: String(svgIssued.mediaId), filename: disguised },
    });
    expect(refused.isError).toBe(true);
    expect(firstText(refused)).toContain("not what its name says");
  } finally {
    await client.close();
  }

  try {
    // The member publishes from the editor, and the image is in the post.
    await page.goto(`/write/${postId}`);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page).toHaveURL(/\/@theo\//);
    await expect(page.getByTestId("post-body").locator("img")).toHaveAttribute(
      "src",
      /\/storage\/v1\/object\/public\/public-media\/.+\.jpg$/,
    );
  } finally {
    // The post and the upload go even when an assertion above failed.
    await page.goto(`/write/${postId}`);
    await deleteCurrentPost(page);
    await page.goto("/write");
    const row = page.getByTestId("attachment").filter({ hasText: filename });
    await row.getByRole("button", { name: "Remove" }).click();
    await expect(row).toHaveCount(0);
  }
});
