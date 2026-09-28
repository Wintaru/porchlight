import type { UploadView } from "@/lib/upload-view";
import type { UploadOutcome } from "./upload-file";

// One line in the Attachments panel: an upload, or a file that could not go up.
export type UploadRow =
  | { readonly id: string; readonly kind: "done"; readonly upload: UploadView }
  | {
      readonly id: string;
      readonly kind: "failed";
      readonly filename: string;
      readonly error: string;
    };

// The upload with this id as the panel holds it now, from this post's rows or from the
// uploads in no post. The preview looks it up on each render, not from a copy, so a
// "Try again" that finishes while the preview is open shows in it (#91).
export function uploadById(
  rows: readonly UploadRow[],
  loose: readonly UploadView[],
  mediaId: string,
): UploadView | null {
  for (const row of rows) {
    if (row.id === mediaId && row.kind === "done") {
      return row.upload;
    }
  }
  return loose.find((upload) => upload.mediaId === mediaId) ?? null;
}

// This post's rows after a "Try again" on one of them: the fresh upload, or the reason
// it failed.
export function rowsAfterRetry(
  rows: readonly UploadRow[],
  upload: UploadView,
  outcome: UploadOutcome,
): readonly UploadRow[] {
  return rows.map((row) =>
    row.id !== upload.mediaId
      ? row
      : outcome.ok
        ? { id: row.id, kind: "done", upload: outcome.upload }
        : {
            id: row.id,
            kind: "failed",
            filename: upload.originalFilename,
            error: outcome.error,
          },
  );
}

// The uploads in no post after a "Try again" that worked (#91). A failed one stays as
// it was, and the panel shows the reason under it.
export function looseAfterRetry(
  loose: readonly UploadView[],
  outcome: UploadOutcome,
): readonly UploadView[] {
  if (!outcome.ok) {
    return loose;
  }
  return loose.map((upload) =>
    upload.mediaId === outcome.upload.mediaId ? outcome.upload : upload,
  );
}
