import type { MediaAsset } from "@porchlight/core";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { coverViewOf } from "./post-view";

const COVER = "00000000-0000-4000-8000-0000000000c1";

function image(overrides: Partial<MediaAsset>): MediaAsset {
  return {
    id: COVER,
    owner: { kind: "member", profileId: "00000000-0000-4000-8000-000000000003" },
    storagePath: "members/x/porch.png",
    kind: "image",
    mimeType: "image/png",
    originalFilename: "porch.png",
    bytes: 10,
    sha256: "a".repeat(64),
    scanStatus: "clear",
    retainUntil: null,
    publishedPath: null,
    mature: false,
    postId: null,
    usedInPost: false,
    rejectedAt: null,
    createdAt: new Date("2026-10-12T10:00:00.000Z"),
    updatedAt: new Date("2026-10-12T10:00:00.000Z"),
    ...overrides,
  };
}

describe("the post view's cover", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://storage.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  });

  test("a ready cover has its public URL", () => {
    const view = coverViewOf(COVER, image({ publishedPath: "members/x/porch.jpg" }));

    expect(view).toMatchObject({ mediaId: COVER, status: "ready" });
    expect(view.url).toMatch(/^http.+porch\.jpg$/);
  });

  test("a held cover has no URL yet", () => {
    expect(coverViewOf(COVER, image({ scanStatus: "flagged" }))).toEqual({
      mediaId: COVER,
      status: "held for review",
      url: null,
    });
  });

  test("a cover this token may not look up still shows its id", () => {
    expect(coverViewOf(COVER, undefined)).toEqual({
      mediaId: COVER,
      status: null,
      url: null,
    });
  });
});
