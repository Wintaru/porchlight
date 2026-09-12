"use client";

import type { MediaKind } from "@porchlight/core";
import { useState } from "react";

import { deleteUpload, finalizeUpload, requestUpload } from "@/app/write/media-actions";
import styles from "./editor.module.css";
import { uploadToSignedUrl } from "./upload-to-signed-url";

interface Attachment {
  readonly mediaId: string;
  readonly originalFilename: string;
  readonly kind: MediaKind;
  readonly bytes: number;
  readonly viewUrl: string;
}

type Row =
  | { readonly id: string; readonly kind: "uploading"; readonly filename: string }
  | { readonly id: string; readonly kind: "done"; readonly attachment: Attachment }
  | {
      readonly id: string;
      readonly kind: "failed";
      readonly filename: string;
      readonly error: string;
    };

// The editor's own attachment panel (SPEC.md §6): attach a file, see it accepted or
// refused with why, remove one. Every uploaded file stays in quarantine — nothing here
// inserts a link into the body, since a signed view URL goes stale long before #10/#11
// exist to publish a permanent one. A person copies the view link in by hand for now.
export function AttachmentPanel() {
  const [rows, setRows] = useState<readonly Row[]>([]);

  function update(id: string, next: Row): void {
    setRows((current) => current.map((row) => (row.id === id ? next : row)));
  }

  async function attach(file: File): Promise<void> {
    const id = globalThis.crypto.randomUUID();
    setRows((current) => [...current, { id, kind: "uploading", filename: file.name }]);

    const requested = await requestUpload(file.name, file.size);
    if (!requested.ok) {
      update(id, { id, kind: "failed", filename: file.name, error: requested.error });
      return;
    }
    try {
      await uploadToSignedUrl(requested.uploadUrl, file);
    } catch {
      update(id, {
        id,
        kind: "failed",
        filename: file.name,
        error: "The upload did not reach storage. Try again.",
      });
      return;
    }
    const finalized = await finalizeUpload(requested.mediaId, file.name);
    if (!finalized.ok) {
      update(id, { id, kind: "failed", filename: file.name, error: finalized.error });
      return;
    }
    update(id, {
      id,
      kind: "done",
      attachment: {
        mediaId: finalized.mediaId,
        originalFilename: finalized.originalFilename,
        kind: finalized.kind,
        bytes: finalized.bytes,
        viewUrl: finalized.viewUrl,
      },
    });
  }

  async function remove(id: string, attachment: Attachment): Promise<void> {
    const deleted = await deleteUpload(attachment.mediaId);
    if (deleted.ok) {
      setRows((current) => current.filter((row) => row.id !== id));
      return;
    }
    update(id, {
      id,
      kind: "failed",
      filename: attachment.originalFilename,
      error: "That file could not be removed. Try again.",
    });
  }

  return (
    <div className={styles.field}>
      <label className={styles.field}>
        <span className={styles.label}>Attachments</span>
        <input
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file !== undefined) {
              void attach(file);
            }
          }}
        />
      </label>
      {rows.length > 0 && (
        <ul className={styles.attachmentList}>
          {rows.map((row) => (
            <li key={row.id}>
              {row.kind === "uploading" && (
                <span className={styles.hint}>Uploading {row.filename}…</span>
              )}
              {row.kind === "failed" && (
                <span className={styles.hint} data-state="failed">
                  {row.filename}: {row.error}
                </span>
              )}
              {row.kind === "done" && (
                <span className={styles.attachmentRow}>
                  <a href={row.attachment.viewUrl} target="_blank" rel="noreferrer">
                    {row.attachment.originalFilename}
                  </a>
                  <span className={styles.hint}>{formatBytes(row.attachment.bytes)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      void remove(row.id, row.attachment);
                    }}
                  >
                    Remove
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} B`;
  }
  const kib = bytes / 1024;
  if (kib < 1024) {
    return `${kib.toFixed(1)} KiB`;
  }
  return `${(kib / 1024).toFixed(1)} MiB`;
}
