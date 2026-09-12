"use client";

import { type KeyboardEvent, useEffect, useRef } from "react";

import { classNames } from "@/lib/class-names";
import styles from "./editor.module.css";

export type UrlDialogKind = "link" | "image";

export interface UrlDialogValue {
  readonly url: string;
  readonly alt: string;
}

interface UrlDialogProps {
  readonly kind: UrlDialogKind | null;
  readonly initialUrl: string;
  readonly onSubmit: (value: UrlDialogValue) => void;
  readonly onClose: () => void;
}

const TITLE: Record<UrlDialogKind, string> = {
  link: "Add a link",
  image: "Add an image",
};

// The URL prompt behind the Link and Image buttons: what markdown can store is a
// target and, for an image, an alt text. Uploads come with attachments (#9). Not a
// <form>: it sits inside the editor's form, and a form may not nest in a form.
export function UrlDialog({ kind, initialUrl, onSubmit, onClose }: UrlDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const altRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) {
      return;
    }
    if (kind !== null && !dialog.open) {
      dialog.showModal();
      urlRef.current?.focus();
    } else if (kind === null && dialog.open) {
      dialog.close();
    }
  }, [kind]);
  const submit = () => {
    onSubmit({
      url: urlRef.current?.value.trim() ?? "",
      alt: altRef.current?.value.trim() ?? "",
    });
  };
  const submitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onClose={onClose}
      aria-label={kind === null ? undefined : TITLE[kind]}
    >
      {kind !== null && (
        <div key={`${kind}:${initialUrl}`} className={styles.dialogForm}>
          <h2 className={styles.dialogTitle}>{TITLE[kind]}</h2>
          <label className={styles.field}>
            <span className={styles.label}>URL</span>
            <input
              ref={urlRef}
              className={styles.input}
              type="url"
              defaultValue={initialUrl}
              placeholder="https://"
              onKeyDown={submitOnEnter}
            />
          </label>
          {kind === "image" && (
            <label className={styles.field}>
              <span className={styles.label}>Alt text</span>
              <input
                ref={altRef}
                className={styles.input}
                type="text"
                placeholder="What the image shows"
                onKeyDown={submitOnEnter}
              />
            </label>
          )}
          <div className={styles.footer}>
            <button
              type="button"
              className={classNames(styles.button, styles.primary)}
              onClick={submit}
            >
              {kind === "link" ? "Set link" : "Insert image"}
            </button>
            <button type="button" className={styles.button} onClick={onClose}>
              Cancel
            </button>
          </div>
          {kind === "link" && (
            <p className={styles.hint}>Leave the URL empty to remove the link.</p>
          )}
        </div>
      )}
    </dialog>
  );
}
