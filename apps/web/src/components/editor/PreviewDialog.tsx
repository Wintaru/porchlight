"use client";

import { useEffect, useRef } from "react";

import styles from "./editor.module.css";

export type PreviewState =
  | { readonly kind: "closed" }
  | { readonly kind: "loading" }
  | { readonly kind: "failed" }
  | { readonly kind: "ready"; readonly bodyHtml: string };

interface PreviewDialogProps {
  readonly state: PreviewState;
  readonly title: string;
  readonly onClose: () => void;
}

// The post as the page will show it. The HTML comes from the Manager's preview query,
// which is the same sanitizer the save runs (D3), so it is safe to set as HTML here.
export function PreviewDialog({ state, title, onClose }: PreviewDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) {
      return;
    }
    if (state.kind !== "closed" && !dialog.open) {
      dialog.showModal();
    } else if (state.kind === "closed" && dialog.open) {
      dialog.close();
    }
  }, [state.kind]);
  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose} aria-label="Preview">
      <div className={styles.dialogBar}>
        <span className={styles.label}>Preview</span>
        <button type="button" className={styles.button} onClick={onClose}>
          Close
        </button>
      </div>
      <div className={styles.dialogBody} data-testid="preview">
        <h2 className={styles.previewTitle}>{title === "" ? "Untitled" : title}</h2>
        {state.kind === "loading" && <p className={styles.hint}>Rendering…</p>}
        {state.kind === "failed" && (
          <p role="alert">The preview could not be rendered. Try again in a moment.</p>
        )}
        {state.kind === "ready" && (
          <div
            className="prose"
            data-testid="preview-body"
            dangerouslySetInnerHTML={{ __html: state.bodyHtml }}
          />
        )}
      </div>
    </dialog>
  );
}
