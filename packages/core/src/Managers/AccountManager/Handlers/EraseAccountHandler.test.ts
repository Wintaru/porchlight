import { describe, expect, test } from "vitest";

import { FakeMediaStorageState } from "../../../Accessors/MediaStorageAccessor/FakeMediaStorageState";
import { FakeRemoveStorageObjectsHandler } from "../../../Accessors/MediaStorageAccessor/Handlers/FakeRemoveStorageObjectsHandler";
import { MediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/MediaStorageAccessor";
import { RemoveStorageObjectsRequest } from "../../../Accessors/MediaStorageAccessor/Requests/RemoveStorageObjectsRequest";
import { FakeProfileState } from "../../../Accessors/ProfileAccessor/FakeProfileState";
import { FakeEraseProfileHandler } from "../../../Accessors/ProfileAccessor/Handlers/FakeEraseProfileHandler";
import { ProfileAccessor } from "../../../Accessors/ProfileAccessor/ProfileAccessor";
import { EraseProfileRequest } from "../../../Accessors/ProfileAccessor/Requests/EraseProfileRequest";
import { HandlerResolverBuilder } from "../../../Common/HandlerResolverBuilder";
import type { MediaAsset } from "../../../Common/MediaAsset";
import { asset, fakeUploadStores, THEO } from "../../MediaManager/test/uploadStores";
import { EraseAccountRequest } from "../Requests/EraseAccountRequest";
import { AccountErasedResponse } from "../Responses/AccountErasedResponse";
import { EraseAccountHandler } from "./EraseAccountHandler";

const QUARANTINE = "quarantine";

async function erase(assets: readonly MediaAsset[], storedKeys: readonly string[]) {
  const { stores, permissions } = fakeUploadStores(assets);
  const storage = new FakeMediaStorageState();
  for (const key of storedKeys) {
    storage.objects.set(key, new Uint8Array());
  }
  const profiles = new FakeProfileState();
  profiles.profiles.set(THEO.profile.id, THEO.profile);
  const handler = new EraseAccountHandler(
    new ProfileAccessor(
      new HandlerResolverBuilder()
        .register(EraseProfileRequest, new FakeEraseProfileHandler(profiles))
        .build(),
      new HandlerResolverBuilder().build(),
    ),
    stores.mediaAssets,
    new MediaStorageAccessor(
      new HandlerResolverBuilder().build(),
      new HandlerResolverBuilder().build(),
      new HandlerResolverBuilder()
        .register(
          RemoveStorageObjectsRequest,
          new FakeRemoveStorageObjectsHandler(storage),
        )
        .build(),
    ),
    permissions,
    QUARANTINE,
  );
  const response = await handler.handle(new EraseAccountRequest(THEO, THEO.profile.id));
  return { response, stored: [...storage.objects.keys()] };
}

describe("EraseAccountHandler", () => {
  test("removes every upload's original and public copy before the profile", async () => {
    const { response, stored } = await erase(
      [asset("one", { publishedPath: "public-media/u-theo/one.png" }), asset("two")],
      [
        `${QUARANTINE}/members/u-theo/one.png`,
        "public-media/u-theo/one.png",
        `${QUARANTINE}/members/u-theo/two.png`,
      ],
    );

    expect(response).toBeInstanceOf(AccountErasedResponse);
    expect(stored).toEqual([]);
  });

  test("keeps the files of an upload held as evidence", async () => {
    const held = `${QUARANTINE}/members/u-theo/held.png`;
    const { stored } = await erase(
      [asset("held", { retainUntil: new Date(Date.now() + 86_400_000) })],
      [held],
    );

    expect(stored).toEqual([held]);
  });
});
