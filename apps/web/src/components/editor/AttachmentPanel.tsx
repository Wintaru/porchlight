"use client";

import { useEffect, useState } from "react";

import { deleteUpload, listUploads, republishUpload } from "@/app/write/media-actions";
import type { UploadView } from "@/lib/upload-view";
import type { BodyInsert } from "./BodyEditor";
import { DropZone } from "./DropZone";
import styles from "./editor.module.css";
import { formatBytes, uploadFile } from "./upload-file";

interface AttachmentPanelProps {
  readonly onInsert: (item: BodyInsert) => void;
}

type Row =
  | { readonly id: string; readonly kind: "done"; readonly upload: UploadView }
  | {
      readonly id: string;
      readonly kind: "failed";
      readonly filename: string;
      readonly error: string;
    };

// The editor's uploads (SPEC.md §6, #52): drop or choose a file, see it accepted or
// refused with why, put it into the post, or remove it. The member's recent uploads
// are listed again after a reload. An image goes in as a picture; any other file as a
// download card. A file with no public copy yet (a flagged image) cannot go in.
export function AttachmentPanel({ onInsert }: AttachmentPanelProps) {
  const [rows, setRows] = useState<readonly Row[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void listUploads().then((uploads) => {
      if (!live) {
        return;
      }
      // Anything added while the list loaded stays at the top.
      setRows((current) => [
        ...current,
        ...uploads
          .filter((upload) => !current.some((row) => row.id === upload.mediaId))
          .map((upload): Row => ({ id: upload.mediaId, kind: "done", upload })),
      ]);
    });
    return () => {
      live = false;
    };
  }, []);

  const attach = async (file: File) => {
    setBusy(true);
    const outcome = await uploadFile(file);
    setBusy(false);
    const row: Row = outcome.ok
      ? { id: outcome.upload.mediaId, kind: "done", upload: outcome.upload }
      : {
          id: globalThis.crypto.randomUUID(),
          kind: "failed",
          filename: file.name,
          error: outcome.error,
        };
    setRows((current) => [row, ...current]);
  };

  const retry = async (upload: UploadView) => {
    const outcome = await republishUpload(upload.mediaId);
    setRows((current) =>
      current.map((row) =>
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
      ),
    );
  };

  const remove = async (upload: UploadView) => {
    const deleted = await deleteUpload(upload.mediaId);
    setRows((current) =>
      deleted.ok
        ? current.filter((row) => row.id !== upload.mediaId)
        : current.map((row) =>
            row.id === upload.mediaId
              ? {
                  id: row.id,
                  kind: "failed",
                  filename: upload.originalFilename,
                  error: "That file could not be removed. Try again.",
                }
              : row,
          ),
    );
  };

  return (
    <div className={styles.field}>
      <span className={styles.label}>Attachments</span>
      <DropZone
        label="Choose a file"
        busy={busy}
        onFile={(file) => {
          void attach(file);
        }}
        testId="attachment-drop"
      >
        <span className={styles.hint}>Drop a file here: images, PDFs, documents</span>
      </DropZone>
      {rows.length > 0 && (
        <ul className={styles.attachmentList} data-testid="attachment-list">
          {rows.map((row) => (
            <li key={row.id} data-testid="attachment">
              {row.kind === "failed" ? (
                <span className={styles.hint} data-state="failed" role="alert">
                  {row.filename}: {row.error}
                </span>
              ) : (
                <AttachmentRow
                  upload={row.upload}
                  onInsert={onInsert}
                  onRetry={() => {
                    void retry(row.upload);
                  }}
                  onRemove={() => {
                    void remove(row.upload);
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface AttachmentRowProps {
  readonly upload: UploadView;
  readonly onInsert: (item: BodyInsert) => void;
  readonly onRetry: () => void;
  readonly onRemove: () => void;
}

function AttachmentRow({ upload, onInsert, onRetry, onRemove }: AttachmentRowProps) {
  const { publicUrl } = upload;
  const note = upload.awaitingReview
    ? " · a moderator looks at it first"
    : upload.mature
      ? " · mature: it can be the cover, where it is blurred"
      : upload.retryable
        ? " · not ready to show yet"
        : "";
  return (
    <div className={styles.attachmentRow}>
      <span className={styles.attachmentName}>
        <strong>{upload.originalFilename}</strong>
        <span className={styles.hint}>
          {formatBytes(upload.bytes)}
          {note}
        </span>
      </span>
      {upload.retryable && (
        <button type="button" className={styles.linkButton} onClick={onRetry}>
          Try again
        </button>
      )}
      {publicUrl !== null && !upload.mature && (
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => {
            onInsert(
              upload.kind === "image"
                ? { kind: "image", url: publicUrl, alt: altOf(upload.originalFilename) }
                : {
                    kind: "file",
                    url: publicUrl,
                    label: `${upload.originalFilename} · ${formatBytes(upload.bytes)}`,
                  },
            );
          }}
        >
          Insert
        </button>
      )}
      <button type="button" className={styles.linkButton} onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}

// A first guess at alt text from the file's name; the author can edit it in the body.
function altOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return (dot > 0 ? filename.slice(0, dot) : filename).replace(/[-_]+/g, " ").trim();
}
