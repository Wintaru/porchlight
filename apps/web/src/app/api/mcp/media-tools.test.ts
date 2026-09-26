import {
  type MediaAsset,
  MediaForbiddenResponse,
  NoSuchMediaResponse,
  MediaQuotaExceededResponse,
  MediaRefusedResponse,
  MediaRejectedResponse,
} from "@porchlight/core";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  curlLineFor,
  mediaLookupRefusalFor,
  mediaRefusalFor,
  uploadStatusOf,
} from "./media-tools";

function asset(overrides: Partial<MediaAsset>): MediaAsset {
  return {
    id: "00000000-0000-4000-8000-0000000000d9",
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
    createdAt: new Date("2026-09-25T10:00:00.000Z"),
    updatedAt: new Date("2026-09-25T10:00:00.000Z"),
    ...overrides,
  };
}

function textOf(result: { content: { text: string }[] }): string {
  return result.content[0]?.text ?? "";
}

describe("the MCP upload tools (#31)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://storage.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  });

  test("a locked upload answers only 'Refused.', with no reason", () => {
    const result = mediaRefusalFor(new MediaRefusedResponse("c1"), "finalize_upload");
    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe("Refused.");
  });

  test("get_media answers a locked id exactly as it answers a missing one", () => {
    const locked = mediaLookupRefusalFor(new MediaForbiddenResponse("c1", "not-allowed"));
    const missing = mediaLookupRefusalFor(new NoSuchMediaResponse("c1", "m1"));
    expect(textOf(locked)).toBe(textOf(missing));
  });

  test("a type mismatch and a quota are refusals the agent can explain", () => {
    expect(
      textOf(mediaRefusalFor(new MediaRejectedResponse("c1", "type-mismatch"), "x")),
    ).toContain("not what its name says");
    expect(
      textOf(
        mediaRefusalFor(new MediaQuotaExceededResponse("c1", "file-too-large", 5), "x"),
      ),
    ).toContain("5-byte limit");
  });

  test("a held upload has no URL; a published image has its markdown", () => {
    expect(uploadStatusOf(asset({ scanStatus: "flagged" }))).toMatchObject({
      status: "held for review",
      url: null,
      markdown: null,
    });
    const ready = uploadStatusOf(asset({ publishedPath: "members/x/porch.jpg" }));
    expect(ready.status).toBe("ready");
    expect(ready.markdown).toMatch(/^!\[porch\]\(http.+porch\.jpg\)$/);
  });

  test("an image that will not decode says so, and a failed copy stays retryable", () => {
    expect(uploadStatusOf(asset({}), "undecodable").status).toBe("unreadable image");
    expect(uploadStatusOf(asset({})).status).toBe("not published");
  });

  test("the curl line carries the URL and the public key, never a secret", () => {
    const line = curlLineFor("http://storage.example/upload?token=t", "anon-key");
    expect(line).toContain('"http://storage.example/upload?token=t"');
    expect(line).toContain("apikey: anon-key");
  });
});
