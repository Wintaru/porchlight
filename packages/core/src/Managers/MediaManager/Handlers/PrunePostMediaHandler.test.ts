import { describe, expect, test } from "vitest";

import type { Actor } from "../../../Common/Actor";
import type { MediaAsset } from "../../../Common/MediaAsset";
import type { PostMediaUse } from "../../../Utilities/media/postUsesMedia";
import { PrunePostMediaRequest } from "../Requests/PrunePostMediaRequest";
import { MediaForbiddenResponse } from "../Responses/MediaForbiddenResponse";
import { MediaPrunedResponse } from "../Responses/MediaPrunedResponse";
import { asset, fakeUploadStores, THEO, theosAgent } from "../test/uploadStores";
import { PrunePostMediaHandler } from "./PrunePostMediaHandler";

// Issue #90: the prune after a save, the same for the editor and for an agent.

const NOTHING: PostMediaUse = { bodyMd: "Nothing in it now.", coverMediaId: null };

async function prunePost(
  actor: Actor,
  assets: readonly MediaAsset[],
  saved: PostMediaUse = NOTHING,
  used: readonly string[] = [],
) {
  const { state, stores, permissions } = fakeUploadStores(assets, { used });
  const handler = new PrunePostMediaHandler(
    stores.storage,
    stores.mediaAssets,
    stores.quotas,
    permissions,
    stores.options,
  );
  const response = await handler.handle(
    new PrunePostMediaRequest(actor, "p-porch", saved),
  );
  return { state, response };
}

describe("PrunePostMediaHandler", () => {
  test("deletes an upload a saved version used and the post took out", async () => {
    const { state, response } = await prunePost(THEO, [asset("out")]);

    expect(response).toBeInstanceOf(MediaPrunedResponse);
    expect(state.assets.has("out")).toBe(false);
  });

  test("keeps an upload not put in yet, and one another post's upload", async () => {
    const { state } = await prunePost(THEO, [
      asset("later", { usedInPost: false }),
      asset("elsewhere", { postId: "p-other" }),
    ]);

    expect(state.assets.has("later")).toBe(true);
    expect(state.assets.has("elsewhere")).toBe(true);
  });

  test("keeps an upload the saved text uses, even when the stored row says otherwise", async () => {
    // A late autosave wrote older text after this save: the database would call the
    // upload unused, but the text the author just saved has it.
    const saved = {
      bodyMd: "![back](https://x.test/public-media/back.png)",
      coverMediaId: null,
    };
    const { state } = await prunePost(THEO, [asset("back"), asset("cover")], {
      ...saved,
      coverMediaId: "cover",
    });

    expect(state.assets.has("back")).toBe(true);
    expect(state.assets.has("cover")).toBe(true);
  });

  test("keeps an upload a comment still shows", async () => {
    const { state } = await prunePost(THEO, [asset("in-comment")], NOTHING, [
      "in-comment",
    ]);

    expect(state.assets.has("in-comment")).toBe(true);
  });

  test("an agent with the draft scope prunes like the editor (C11)", async () => {
    const { state, response } = await prunePost(theosAgent(), [asset("out")]);

    expect((response as MediaPrunedResponse).deletedIds).toEqual(["out"]);
    expect(state.assets.has("out")).toBe(false);
  });

  test("an agent without the draft scope deletes nothing", async () => {
    const { state, response } = await prunePost(theosAgent(["media:upload"]), [
      asset("out"),
    ]);

    expect((response as MediaPrunedResponse).keptIds).toEqual(["out"]);
    expect(state.assets.has("out")).toBe(true);
  });

  test("a visitor prunes nothing", async () => {
    const { response } = await prunePost({ kind: "visitor" }, [asset("out")]);

    expect(response).toBeInstanceOf(MediaForbiddenResponse);
  });
});
