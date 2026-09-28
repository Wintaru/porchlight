"use client";

import { useEffect, useRef } from "react";

import { RevealImage } from "@/components/RevealImage";
import { classNames } from "@/lib/class-names";
import type { UploadView } from "@/lib/upload-view";
import styles from "./editor.module.css";
import { formatBytes } from "./upload-file";

interface AttachmentPreviewProps {
  // The upload to show, or null while the dialog is closed.
  readonly upload: UploadView | null;
  // Null when the upload cannot go in (no public copy yet, or mature).
  readonly onInsert: (() => void) | null;
  readonly onClose: () => void;
}

// What an upload is, before it goes in (#80): an image shows, a video plays, any other
// file is named with its type and size. Only the public copy is ever shown. A file a
// moderator has not cleared has none, so it shows no picture at all. A mature image is
// blurred behind a click, as on the post page (SPEC.md §7), and a mature video does not
// play here.
export function AttachmentPreview({ upload, onInsert, onClose }: AttachmentPreviewProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = upload !== null;
  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onClose={onClose}
      aria-label={upload === null ? undefined : `Preview of ${upload.originalFilename}`}
      data-testid="attachment-preview"
    >
      {upload !== null && (
        <>
          <div className={styles.dialogBar}>
            <span className={styles.label}>Preview</span>
            <button type="button" className={styles.button} onClick={onClose}>
              Close
            </button>
          </div>
          <div key={upload.mediaId} className={styles.dialogForm}>
            <h2 className={classNames(styles.dialogTitle, styles.previewName)}>
              {upload.originalFilename}
            </h2>
            <PreviewMedia upload={upload} />
            <p className={styles.hint}>
              {upload.mimeType} · {formatBytes(upload.bytes)}
            </p>
            {upload.mature && (
              <p className={styles.hint}>A mature file can only be the cover.</p>
            )}
            {onInsert !== null && (
              <div className={styles.footer}>
                <button
                  type="button"
                  className={classNames(styles.button, styles.primary)}
                  onClick={onInsert}
                >
                  Insert
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </dialog>
  );
}

function PreviewMedia({ upload }: { readonly upload: UploadView }) {
  const { publicUrl } = upload;
  if (publicUrl === null) {
    if (upload.awaitingReview) {
      return (
        <p className={styles.hint}>
          A moderator looks at it first. It shows once cleared.
        </p>
      );
    }
    if (upload.rejected) {
      return (
        <p className={styles.hint}>
          A moderator turned it down, so it cannot go in a post.
        </p>
      );
    }
    return (
      <p className={styles.hint}>
        {upload.unreadable
          ? "This image could not be read, so there is nothing to show."
          : "It is not ready to show yet."}
      </p>
    );
  }
  if (upload.kind === "image") {
    return upload.mature ? (
      <RevealImage
        id={`preview-${upload.mediaId}`}
        src={publicUrl}
        alt={upload.originalFilename}
        mode="mature"
        className={styles.previewMedia}
      />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element -- storage origin, not optimised by next/image
      <img
        className={styles.previewMedia}
        src={publicUrl}
        alt={upload.originalFilename}
      />
    );
  }
  if (upload.kind === "video") {
    return upload.mature ? (
      <p className={styles.hint}>Mature video. It does not play here.</p>
    ) : (
      <video
        className={styles.previewMedia}
        src={publicUrl}
        controls
        playsInline
        preload="metadata"
        data-testid="attachment-preview-video"
      />
    );
  }
  return null;
}
