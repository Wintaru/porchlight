import { describe, expect, test } from "vitest";

import type { UploadView } from "@/lib/upload-view";
import {
  looseAfterRetry,
  rowsAfterRetry,
  uploadById,
  type UploadRow,
} from "./upload-rows";

function upload(mediaId: string, publicUrl: string | null = null): UploadView {
  return {
    mediaId,
    originalFilename: `${mediaId}.jpg`,
    kind: "image",
    mimeType: "image/jpeg",
    bytes: 100,
    publicUrl,
    awaitingReview: false,
    rejected: false,
    retryable: publicUrl === null,
    unreadable: false,
    mature: false,
  };
}

const done = (view: UploadView): UploadRow => ({
  id: view.mediaId,
  kind: "done",
  upload: view,
});

describe("uploadById", () => {
  test("finds an upload in this post's rows, then in the uploads in no post", () => {
    const [a, b] = [upload("a"), upload("b")];
    expect(uploadById([done(a)], [b], "a")).toBe(a);
    expect(uploadById([done(a)], [b], "b")).toBe(b);
  });

  test("has nothing for a failed row or an unknown id", () => {
    const failed: UploadRow = { id: "a", kind: "failed", filename: "a.jpg", error: "x" };
    expect(uploadById([failed], [], "a")).toBeNull();
    expect(uploadById([], [], "z")).toBeNull();
  });
});

describe("a retry", () => {
  const fresh = upload("a", "https://storage.example/a.jpg");

  test("updates the preview's upload when it finishes (#91)", () => {
    const rows = rowsAfterRetry([done(upload("a"))], upload("a"), {
      ok: true,
      upload: fresh,
    });
    expect(uploadById(rows, [], "a")?.publicUrl).toBe(fresh.publicUrl);
  });

  test("updates an upload in no post, which a row-only update missed (#91)", () => {
    const loose = looseAfterRetry([upload("a"), upload("b")], {
      ok: true,
      upload: fresh,
    });
    expect(uploadById([], loose, "a")?.publicUrl).toBe(fresh.publicUrl);
    expect(uploadById([], loose, "b")?.publicUrl).toBeNull();
  });

  test("leaves an upload in no post as it was when it fails", () => {
    const before = [upload("a")];
    expect(looseAfterRetry(before, { ok: false, error: "no" })).toBe(before);
  });

  test("turns a row into its failure", () => {
    const rows = rowsAfterRetry([done(upload("a"))], upload("a"), {
      ok: false,
      error: "no",
    });
    expect(rows).toEqual([{ id: "a", kind: "failed", filename: "a.jpg", error: "no" }]);
  });
});
