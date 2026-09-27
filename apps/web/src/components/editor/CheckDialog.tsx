"use client";

import { useEffect, useRef } from "react";

import styles from "./editor.module.css";

export type CheckState =
  | { readonly kind: "closed" }
  | { readonly kind: "loading" }
  | { readonly kind: "failed" }
  | { readonly kind: "ready"; readonly warnings: readonly string[] };

interface CheckDialogProps {
  readonly state: CheckState;
  readonly onClose: () => void;
}

// The draft check's warnings (#32), the same ones an agent gets from check_draft.
// Warnings, not rules: the writer decides.
export function CheckDialog({ state, onClose }: CheckDialogProps) {
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
    <dialog ref={ref} className={styles.dialog} onClose={onClose} aria-label="Check">
      <div className={styles.dialogBar}>
        <span className={styles.label}>Check</span>
        <button type="button" className={styles.button} onClick={onClose}>
          Close
        </button>
      </div>
      <div className={styles.dialogBody} data-testid="draft-check">
        {state.kind === "loading" && <p className={styles.hint}>Checking…</p>}
        {state.kind === "failed" && (
          <p role="alert">The draft could not be checked. Try again in a moment.</p>
        )}
        {state.kind === "ready" &&
          (state.warnings.length === 0 ? (
            <p data-testid="draft-check-clear">
              Nothing found. The check looks for your banned phrases and a few habits of
              machine writing, and misses a lot, so read it once more yourself.
            </p>
          ) : (
            <ul data-testid="draft-check-warnings">
              {state.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ))}
      </div>
    </dialog>
  );
}
