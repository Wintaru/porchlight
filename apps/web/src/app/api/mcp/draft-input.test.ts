import { describe, expect, test } from "vitest";

import { draftChangesOf, newDraftOf } from "./draft-input";

const COVER = "00000000-0000-4000-8000-0000000000c1";

describe("the draft tools' cover_media_id", () => {
  test("create_draft passes the cover through, and none means no cover", () => {
    const base = { title: "Porch", body_md: "Words." };

    expect(newDraftOf({ ...base, cover_media_id: COVER }).coverMediaId).toBe(COVER);
    expect(newDraftOf(base).coverMediaId).toBeNull();
  });

  test("update_draft sets the cover with an id and clears it with null", () => {
    expect(draftChangesOf({ cover_media_id: COVER })).toEqual({ coverMediaId: COVER });
    expect(draftChangesOf({ cover_media_id: null })).toEqual({ coverMediaId: null });
  });

  test("update_draft without cover_media_id leaves the cover alone", () => {
    const changes = draftChangesOf({ title: "A new title" });

    expect(changes).toEqual({ title: "A new title" });
    expect("coverMediaId" in changes).toBe(false);
  });
});
