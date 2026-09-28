import { describe, expect, test } from "vitest";

import { PruneMediaRequest } from "../Requests/PruneMediaRequest";
import { MediaPrunedResponse } from "../Responses/MediaPrunedResponse";
import { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { asset, fakeUploadStores, THEO } from "../test/uploadStores";
import { PruneMediaHandler } from "./PruneMediaHandler";

function prune(
  assets: ReturnType<typeof asset>[],
  options: { readonly used?: readonly string[]; readonly failing?: boolean } = {},
) {
  const { state, stores, permissions } = fakeUploadStores(assets, options);
  const handler = new PruneMediaHandler(
    stores.storage,
    stores.mediaAssets,
    stores.quotas,
    permissions,
    stores.options,
  );
  const ids = assets.map((a) => a.id);
  return { state, result: handler.handle(new PruneMediaRequest(THEO, ids, null)) };
}

describe("PruneMediaHandler", () => {
  test("deletes the named uploads nothing shows, and keeps the ones a post or comment shows", async () => {
    const { state, result } = prune([asset("gone"), asset("kept")], { used: ["kept"] });

    const pruned = (await result) as MediaPrunedResponse;
    expect(pruned).toBeInstanceOf(MediaPrunedResponse);
    expect(pruned.deletedIds).toEqual(["gone"]);
    expect(state.assets.has("gone")).toBe(false);
    expect(state.assets.has("kept")).toBe(true);
  });

  test("never deletes someone else's upload", async () => {
    const theirs = asset("theirs", { owner: { kind: "member", profileId: "u-ivy" } });
    const { state, result } = prune([theirs]);

    expect(((await result) as MediaPrunedResponse).deletedIds).toEqual([]);
    expect(state.assets.has("theirs")).toBe(true);
  });

  test("a retained upload stays, and is reported kept", async () => {
    const locked = asset("locked", {
      scanStatus: "locked",
      retainUntil: new Date(Date.now() + 86_400_000),
    });
    const { state, result } = prune([locked]);

    expect(((await result) as MediaPrunedResponse).keptIds).toEqual(["locked"]);
    expect(state.assets.has("locked")).toBe(true);
  });

  test("a store it cannot read deletes nothing", async () => {
    const { result } = prune([asset("gone")], { failing: true });

    expect(await result).toBeInstanceOf(MediaUnavailableResponse);
  });
});
