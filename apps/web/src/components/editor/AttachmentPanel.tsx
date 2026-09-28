"use client";

import { useEffect, useRef, useState } from "react";

import {
  attachUpload,
  deleteUpload,
  listUnattachedUploads,
  listUploads,
  republishUpload,
} from "@/app/write/media-actions";
import { classNames } from "@/lib/class-names";
import type { UploadView } from "@/lib/upload-view";
import { AttachmentPreview } from "./AttachmentPreview";
import type { BodyInsert } from "./BodyEditor";
import { DropZone } from "./DropZone";
import styles from "./editor.module.css";
import { formatBytes, type UploadProgress, uploadFile } from "./upload-file";
import {
  looseAfterRetry,
  rowsAfterRetry,
  uploadById,
  type UploadRow,
} from "./upload-rows";

interface AttachmentPanelProps {
  readonly onInsert: (item: BodyInsert) => void;
  // The post being edited, or "" while a new post has no id yet.
  readonly postId: string;
}

// The editor's uploads (SPEC.md §6, #52): drop or choose a file, see it accepted or
// refused with why, put it into the post, or remove it. Only this post's uploads are
// listed (#80), again after a reload. An upload made before a new post has an id joins
// the post once autosave gives it one. Uploads in no post at all sit apart, folded, so
// the member can still put one in or remove it. Pressing a row opens a preview, and the
// preview puts it in (#80): an image goes in as a picture, a video as a player (#21), any
// other file as a download card. A file with no public copy yet (a flagged image) cannot
// go in.
export function AttachmentPanel({ onInsert, postId }: AttachmentPanelProps) {
  const [rows, setRows] = useState<readonly UploadRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  // Uploads made while the post had no id, and the id once it has one: an upload that
  // finishes after the id arrives is attached at once instead of waiting here.
  const unattached = useRef<string[]>([]);
  const currentPostId = useRef(postId);
  const [loose, setLoose] = useState<readonly UploadView[]>([]);
  // The id, not a copy: the preview shows the upload as the panel holds it now (#91).
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  // Why a Remove was refused, by upload (#90), or why a "Try again" on an upload in no
  // post failed (#91): the row stays, with the reason under it.
  const [refusals, setRefusals] = useState<ReadonlyMap<string, string>>(new Map());

  useEffect(() => {
    currentPostId.current = postId;
    if (postId === "") {
      return;
    }
    let live = true;
    const waiting = unattached.current;
    unattached.current = [];
    void Promise.all(waiting.map((mediaId) => attachUpload(mediaId, postId)))
      .then(() => {
        void listUnattachedUploads().then((uploads) => {
          if (live) {
            setLoose(uploads);
          }
        });
        return listUploads(postId);
      })
      .then((uploads) => {
        if (!live) {
          return;
        }
        // Anything added while the list loaded stays at the top.
        setRows((current) => [
          ...current,
          ...uploads
            .filter((upload) => !current.some((row) => row.id === upload.mediaId))
            .map((upload): UploadRow => ({ id: upload.mediaId, kind: "done", upload })),
        ]);
      });
    return () => {
      live = false;
    };
  }, [postId]);

  // A new post has no id, so no list of its own yet: only the uploads in no post.
  useEffect(() => {
    if (postId !== "") {
      return;
    }
    let live = true;
    void listUnattachedUploads().then((uploads) => {
      if (live) {
        setLoose(uploads);
      }
    });
    return () => {
      live = false;
    };
  }, [postId]);

  const attach = async (file: File) => {
    setBusy(true);
    const madeFor = postId;
    const outcome = await uploadFile(file, setProgress, madeFor === "" ? null : madeFor);
    setBusy(false);
    setProgress(null);
    if (outcome.ok && madeFor === "") {
      const mediaId = outcome.upload.mediaId;
      if (currentPostId.current === "") {
        unattached.current.push(mediaId);
      } else {
        void attachUpload(mediaId, currentPostId.current);
      }
    }
    const row: UploadRow = outcome.ok
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
    setRows((current) => rowsAfterRetry(current, upload, outcome));
    // An upload in no post keeps its line when a retry fails, so the reason goes under
    // it, as a refused Remove does (#91). A row above shows its own failure instead.
    setLoose((current) => looseAfterRetry(current, outcome));
    setRefusals((current) => {
      const next = new Map(current);
      if (outcome.ok) {
        next.delete(upload.mediaId);
      } else {
        next.set(upload.mediaId, outcome.error);
      }
      return next;
    });
  };

  const remove = async (upload: UploadView) => {
    const deleted = await deleteUpload(upload.mediaId);
    setRefusals((current) => {
      const next = new Map(current);
      if (deleted.ok) {
        next.delete(upload.mediaId);
      } else {
        next.set(upload.mediaId, deleted.error);
      }
      return next;
    });
    if (deleted.ok) {
      setRows((current) => current.filter((row) => row.id !== upload.mediaId));
      setLoose((current) => current.filter((u) => u.mediaId !== upload.mediaId));
    }
  };
  const shownLoose = loose.filter(
    (upload) => !rows.some((row) => row.id === upload.mediaId),
  );
  const previewing = previewingId === null ? null : uploadById(rows, loose, previewingId);
  const previewInsert = previewing === null ? null : insertOf(previewing);

  return (
    <div className={styles.field}>
      <span className={styles.label}>Attachments</span>
      <DropZone
        label="Choose a file"
        busy={busy}
        busyLabel={progressLabel(progress)}
        onFile={(file) => {
          void attach(file);
        }}
        testId="attachment-drop"
      >
        <span className={styles.hint}>
          Drop a file here: images, videos, PDFs, documents
        </span>
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
                  refusal={refusals.get(row.id)}
                  onPreview={() => {
                    setPreviewingId(row.id);
                  }}
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
      {shownLoose.length > 0 && (
        <details data-testid="unattached-uploads">
          <summary className={styles.hint}>
            Not in any post ({String(shownLoose.length)})
          </summary>
          <ul className={styles.attachmentList}>
            {shownLoose.map((upload) => (
              <li key={upload.mediaId} data-testid="unattached-upload">
                <AttachmentRow
                  upload={upload}
                  refusal={refusals.get(upload.mediaId)}
                  onPreview={() => {
                    setPreviewingId(upload.mediaId);
                  }}
                  onRetry={() => {
                    void retry(upload);
                  }}
                  onRemove={() => {
                    void remove(upload);
                  }}
                />
              </li>
            ))}
          </ul>
        </details>
      )}
      <AttachmentPreview
        upload={previewing}
        onInsert={
          previewInsert === null
            ? null
            : () => {
                onInsert(previewInsert);
                setPreviewingId(null);
              }
        }
        onClose={() => {
          setPreviewingId(null);
        }}
      />
    </div>
  );
}

interface AttachmentRowProps {
  readonly upload: UploadView;
  readonly refusal: string | undefined;
  readonly onPreview: () => void;
  readonly onRetry: () => void;
  readonly onRemove: () => void;
}

function AttachmentRow({
  upload,
  refusal,
  onPreview,
  onRetry,
  onRemove,
}: AttachmentRowProps) {
  const note = upload.awaitingReview
    ? " · a moderator looks at it first"
    : upload.rejected
      ? " · a moderator turned it down, so it cannot go in a post"
      : upload.mature
        ? " · mature: it can be the cover, where it is blurred"
        : upload.retryable
          ? " · not ready to show yet"
          : upload.unreadable
            ? " · this image could not be read, so upload a different file"
            : "";
  return (
    <div className={styles.attachmentRow}>
      <button
        type="button"
        className={classNames(styles.attachmentName, styles.attachmentOpen)}
        aria-haspopup="dialog"
        onClick={onPreview}
      >
        <strong>{upload.originalFilename}</strong>
        <span className={styles.hint}>
          {formatBytes(upload.bytes)}
          {note}
        </span>
      </button>
      {upload.retryable && (
        <button type="button" className={styles.linkButton} onClick={onRetry}>
          Try again
        </button>
      )}
      <button type="button" className={styles.linkButton} onClick={onRemove}>
        Remove
      </button>
      {refusal !== undefined && (
        <span
          className={classNames(styles.hint, styles.attachmentRefusal)}
          data-state="failed"
          role="alert"
        >
          {refusal}
        </span>
      )}
    </div>
  );
}

// What an upload puts in the body, or null when it cannot go in: no public copy yet, or
// a mature image, which is only ever a cover.
function insertOf(upload: UploadView): BodyInsert | null {
  const { publicUrl } = upload;
  if (publicUrl === null || upload.mature) {
    return null;
  }
  return upload.kind === "image"
    ? { kind: "image", url: publicUrl, alt: altOf(upload.originalFilename) }
    : {
        // A video's link alone on its line plays in the post (#21).
        kind: "file",
        url: publicUrl,
        label:
          upload.kind === "video"
            ? upload.originalFilename
            : `${upload.originalFilename} · ${formatBytes(upload.bytes)}`,
      };
}

// A first guess at alt text from the file's name; the author can edit it in the body.
function altOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return (dot > 0 ? filename.slice(0, dot) : filename).replace(/[-_]+/g, " ").trim();
}

// A video can take a while: say which step it is on and how far along.
function progressLabel(progress: UploadProgress | null): string {
  if (progress === null) {
    return "Uploading…";
  }
  const percent = `${String(Math.round(progress.fraction * 100))}%`;
  return progress.stage === "preparing"
    ? `Preparing video… ${percent}`
    : `Uploading… ${percent}`;
}
