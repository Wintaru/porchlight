import { describe, expect, test } from "vitest";

import type { Profile } from "../../../Common/Profile";
import { VOICE_GUIDE_REVISIONS_KEPT } from "../../../Common/VoiceGuideRevision";
import { FakeProfileState } from "../FakeProfileState";
import { EraseProfileRequest } from "../Requests/EraseProfileRequest";
import { LoadVoiceGuideRevisionsRequest } from "../Requests/LoadVoiceGuideRevisionsRequest";
import { StoreVoiceGuideRequest } from "../Requests/StoreVoiceGuideRequest";
import { VoiceGuideRevisionsLoadedResponse } from "../Responses/VoiceGuideRevisionsLoadedResponse";
import { FakeEraseProfileHandler } from "./FakeEraseProfileHandler";
import { FakeLoadVoiceGuideRevisionsHandler } from "./FakeLoadVoiceGuideRevisionsHandler";
import { FakeStoreVoiceGuideHandler } from "./FakeStoreVoiceGuideHandler";

const THEO: Profile = {
  id: "00000000-0000-4000-8000-000000000003",
  handle: "theo",
  displayName: "Theo",
  avatarUrl: null,
  bio: null,
  role: "member",
  trustLevel: "trusted",
  status: "active",
  createdAt: new Date("2026-09-12T10:00:00.000Z"),
};

// The fake store keeps revisions the way the real trigger and `erase_account` do
// (#32, #83), so tests on the fake see the same history the real store would keep.
describe("fake voice guide revisions", () => {
  function setUp() {
    const state = new FakeProfileState();
    state.profiles.set(THEO.id, THEO);
    return {
      store: new FakeStoreVoiceGuideHandler(state),
      load: new FakeLoadVoiceGuideRevisionsHandler(state),
      erase: new FakeEraseProfileHandler(state),
    };
  }

  async function revisions(load: FakeLoadVoiceGuideRevisionsHandler) {
    const loaded = await load.handle(new LoadVoiceGuideRevisionsRequest(THEO.id));
    if (!(loaded instanceof VoiceGuideRevisionsLoadedResponse)) {
      throw new Error(`expected revisions, got ${loaded.constructor.name}`);
    }
    return loaded.revisions.map((revision) => revision.guideMd);
  }

  test("keeps only the newest versions, like the trigger", async () => {
    const { store, load } = setUp();
    for (let i = 0; i < VOICE_GUIDE_REVISIONS_KEPT + 5; i += 1) {
      await store.handle(new StoreVoiceGuideRequest(THEO.id, `v${String(i)}`));
    }

    const kept = await revisions(load);

    expect(kept.length).toBe(VOICE_GUIDE_REVISIONS_KEPT);
    expect(kept[0]).toBe(`v${String(VOICE_GUIDE_REVISIONS_KEPT + 3)}`);
    expect(kept.at(-1)).toBe("v4");
  });

  test("erasure keeps no version, like erase_account", async () => {
    const { store, load, erase } = setUp();
    await store.handle(new StoreVoiceGuideRequest(THEO.id, "a"));
    await store.handle(new StoreVoiceGuideRequest(THEO.id, "b"));

    await erase.handle(new EraseProfileRequest(THEO.id));

    expect(await revisions(load)).toEqual([]);
  });
});
