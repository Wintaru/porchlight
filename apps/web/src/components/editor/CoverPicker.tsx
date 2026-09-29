"use client";

import { CENTERED_COVER_FRAME, isImageFilename } from "@porchlight/core/client";
import { useState } from "react";

import { deleteUpload } from "@/app/write/media-actions";
import { CoverFramer } from "./CoverFramer";
import { DropZone } from "./DropZone";
import styles from "./editor.module.css";
import { uploadFile } from "./upload-file";
import type { CoverState } from "./use-cover";

interface CoverPickerProps {
  readonly state: CoverState;
  // The post being edited, or "" while a new post has no id: a cover joins its post
  // (#80).
  readonly postId: string;
}

// The Editor board's "Cover image" (#52): one of the author's images, shown on the post
// above the body and on the share card, and framed for the feed card. The hidden fields
// carry its id and framing with the rest of the form; the Manager checks it is the
// author's own image. A picture already uploaded can be chosen from Attachments instead.
export function CoverPicker({ state, postId }: CoverPickerProps) {
  const { cover, frame } = state;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (file: File) => {
    // Refused before any conversion or upload (#91): a dropped video would otherwise be
    // converted, uploaded and counted against the quota, then turned down.
    if (!isImageFilename(file.name)) {
      setError(NOT_AN_IMAGE);
      return;
    }
    setBusy(true);
    setError(null);
    const outcome = await uploadFile(file, undefined, postId === "" ? null : postId);
    setBusy(false);
    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    if (outcome.upload.kind !== "image") {
      // The name said image and the bytes did not. Remove the upload so it does not
      // count against the quota. If that fails, it waits in "Not in any post".
      setError(NOT_AN_IMAGE);
      deleteUpload(outcome.upload.mediaId).then(
        (deleted) => {
          if (!deleted.ok) {
            console.warn("a refused cover upload was not removed", deleted.error);
          }
        },
        (failure: unknown) => {
          console.error("a refused cover upload was not removed", failure);
        },
      );
      return;
    }
    state.choose(outcome.upload);
  };

  return (
    <div className={styles.field}>
      <span className={styles.label} id="cover-label">
        Cover image
      </span>
      <input type="hidden" name="coverMediaId" value={state.mediaId} />
      <input type="hidden" name="coverFocusX" value={frame.focusX} />
      <input type="hidden" name="coverFocusY" value={frame.focusY} />
      <input type="hidden" name="coverZoom" value={frame.zoom} />
      {cover.kind === "unseen" && (
        <p className={styles.coverHeld} role="status">
          The cover could not be shown just now. It stays on the post.
        </p>
      )}
      {cover.kind === "set" ? (
        <div className={styles.coverSet} data-testid="cover-set">
          {cover.upload.publicUrl === null ? (
            <p className={styles.coverHeld} data-testid="cover-held">
              {cover.upload.awaitingReview
                ? "A moderator looks at this image first. Publishing sends the post to them."
                : "This image could not be prepared for the site."}
            </p>
          ) : (
            <CoverFramer
              key={cover.upload.mediaId}
              src={cover.upload.publicUrl}
              mature={cover.upload.mature}
              frame={frame}
              onReframe={state.reframe}
            />
          )}
          <div className={styles.coverActions}>
            {cover.upload.publicUrl !== null && (
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => {
                  state.reframe(() => CENTERED_COVER_FRAME);
                }}
              >
                Reset framing
              </button>
            )}
            <button type="button" className={styles.linkButton} onClick={state.clear}>
              Remove cover
            </button>
          </div>
        </div>
      ) : cover.kind === "unseen" ? null : (
        <DropZone
          label="Choose a cover image"
          accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
          busy={busy || cover.kind === "loading"}
          onFile={(file) => {
            void choose(file);
          }}
          testId="cover-drop"
        >
          <span className={styles.hint}>Drop an image here</span>
        </DropZone>
      )}
      {error !== null && (
        <span className={styles.hint} data-state="failed" role="alert">
          {error}
        </span>
      )}
      <span className={styles.hint}>
        Used on the post, on the feed card and on the card when you share a link. Or press
        Use as cover on a picture in Attachments.
      </span>
    </div>
  );
}

const NOT_AN_IMAGE = "A cover has to be an image.";
