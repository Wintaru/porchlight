"use client";

import { useEffect, useState } from "react";

import { getUpload } from "@/app/write/media-actions";
import type { UploadView } from "@/lib/upload-view";
import { DropZone } from "./DropZone";
import styles from "./editor.module.css";
import { uploadFile } from "./upload-file";

interface CoverPickerProps {
  readonly initialMediaId: string | null;
  readonly onChange: () => void;
}

type Cover =
  | { readonly kind: "none" }
  | { readonly kind: "loading"; readonly mediaId: string }
  | { readonly kind: "unseen"; readonly mediaId: string }
  | { readonly kind: "set"; readonly upload: UploadView };

// The Editor board's "Cover image" (#52): one of the author's images, shown on the post
// above the body and on the share card. The hidden field carries its id with the rest
// of the form; the Manager checks it is the author's own image.
export function CoverPicker({ initialMediaId, onChange }: CoverPickerProps) {
  const [cover, setCover] = useState<Cover>(
    initialMediaId === null
      ? { kind: "none" }
      : { kind: "loading", mediaId: initialMediaId },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A saved cover arrives as an id: look it up once for its picture.
  useEffect(() => {
    if (cover.kind !== "loading") {
      return;
    }
    let live = true;
    void getUpload(cover.mediaId).then((lookup) => {
      if (!live) {
        return;
      }
      if (lookup.status === "found") {
        setCover({ kind: "set", upload: lookup.upload });
      } else if (lookup.status === "gone") {
        setCover({ kind: "none" });
      } else {
        // The cover stays set, unseen: a failed lookup must not clear it on the next save.
        setCover({ kind: "unseen", mediaId: cover.mediaId });
      }
    });
    return () => {
      live = false;
    };
  }, [cover]);

  const choose = async (file: File) => {
    setBusy(true);
    setError(null);
    const outcome = await uploadFile(file);
    setBusy(false);
    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    if (outcome.upload.kind !== "image") {
      setError("A cover has to be an image.");
      return;
    }
    setCover({ kind: "set", upload: outcome.upload });
    onChange();
  };

  const mediaId =
    cover.kind === "set"
      ? cover.upload.mediaId
      : cover.kind === "none"
        ? ""
        : cover.mediaId;

  return (
    <div className={styles.field}>
      <span className={styles.label} id="cover-label">
        Cover image
      </span>
      <input type="hidden" name="coverMediaId" value={mediaId} />
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
            // eslint-disable-next-line @next/next/no-img-element -- storage origin, not optimised by next/image
            <img
              className={styles.coverImage}
              src={cover.upload.publicUrl}
              alt="The cover image"
              data-testid="cover-image"
            />
          )}
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => {
              setCover({ kind: "none" });
              onChange();
            }}
          >
            Remove cover
          </button>
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
        Used on the post and on the card when you share a link.
      </span>
    </div>
  );
}
