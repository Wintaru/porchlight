"use client";

import { type ReactNode, useRef, useState } from "react";

import { classNames } from "@/lib/class-names";
import styles from "./editor.module.css";

interface DropZoneProps {
  // The button's name: what a click does.
  readonly label: string;
  readonly accept?: string;
  readonly busy: boolean;
  readonly onFile: (file: File) => void;
  readonly children?: ReactNode;
  readonly testId: string;
}

// The Editor board's dashed drop zone (#52): drop a file on it, or press the button to
// choose one. The file input itself is never drawn — the browser's own "Choose File"
// cannot be styled — so the button opens it and keyboard users reach the same thing.
export function DropZone({
  label,
  accept,
  busy,
  onFile,
  children,
  testId,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div
      className={classNames(styles.dropZone, dragging && styles.dropZoneActive)}
      data-testid={testId}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => {
        setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file !== undefined && !busy) {
          onFile(file);
        }
      }}
    >
      {children}
      <button
        type="button"
        className={styles.dropButton}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Uploading…" : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        aria-label={label}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file !== undefined) {
            onFile(file);
          }
        }}
      />
    </div>
  );
}
