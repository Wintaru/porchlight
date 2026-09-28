import { describe, expect, test } from "vitest";

import { DeleteMediaRequest } from "../Requests/DeleteMediaRequest";
import { MediaDeletedResponse } from "../Responses/MediaDeletedResponse";
import { MediaInUseResponse } from "../Responses/MediaInUseResponse";
import { asset, fakeUploadStores, THEO } from "../test/uploadStores";
import { DeleteMediaHandler } from "./DeleteMediaHandler";

// Issue #90, C12: Remove refuses a file a post or comment still shows.

async function remove(used: readonly string[]) {
  const { state, stores, permissions } = fakeUploadStores([asset("photo")], { used });
  const handler = new DeleteMediaHandler(
    stores.storage,
    stores.mediaAssets,
    stores.quotas,
    permissions,
    stores.options,
  );
  const response = await handler.handle(new DeleteMediaRequest(THEO, "photo"));
  return { state, response };
}

describe("DeleteMediaHandler", () => {
  test("removes an upload nothing shows", async () => {
    const { state, response } = await remove([]);

    expect(response).toBeInstanceOf(MediaDeletedResponse);
    expect(state.assets.has("photo")).toBe(false);
  });

  test("refuses an upload a post or comment still shows, and keeps it", async () => {
    const { state, response } = await remove(["photo"]);

    expect(response).toBeInstanceOf(MediaInUseResponse);
    expect(state.assets.has("photo")).toBe(true);
  });
});
