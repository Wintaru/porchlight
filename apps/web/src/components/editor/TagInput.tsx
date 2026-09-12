"use client";

import { type KeyboardEvent, useId, useRef, useState } from "react";

import { TAG_MAX_LENGTH } from "@/app/write/parse-post-form";
import { classNames } from "@/lib/class-names";
import styles from "./editor.module.css";

interface TagInputProps {
  readonly tags: readonly string[];
  // How many chips may exist: the parent may hold one slot for the content note.
  readonly max: number;
  readonly onChange: (tags: readonly string[]) => void;
}

// Tags as chips with an "add…" box, as on the board. Enter or a comma adds one,
// Backspace on an empty box removes the last. The parent owns the hidden `tags` field
// (it folds the content note in), so the parser and the Manager see what they always did.
export function TagInput({ tags, max, onChange }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();

  // A pasted "a, b" is two tags, as the form parser would read it.
  const add = (raw: string) => {
    const names = raw
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name !== "");
    setDraft("");
    if (names.length === 0) {
      return;
    }
    const next = [...tags];
    for (const name of names) {
      if (next.length >= max) {
        break;
      }
      if (!next.some((tag) => tag.toLowerCase() === name.toLowerCase())) {
        next.push(name);
      }
    }
    if (next.length !== tags.length) {
      onChange(next);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className={styles.field}>
      <span className={styles.label} id={labelId}>
        Tags
      </span>
      <div
        className={classNames(styles.input, styles.chips)}
        onClick={() => inputRef.current?.focus()}
        role="group"
        aria-labelledby={labelId}
      >
        {tags.map((tag) => (
          <span key={tag} className={styles.chip}>
            <span data-testid="tag-chip">{tag}</span>
            <button
              type="button"
              className={styles.chipRemove}
              aria-label={`Remove tag ${tag}`}
              onClick={() => {
                onChange(tags.filter((other) => other !== tag));
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className={styles.chipInput}
          type="text"
          aria-label="Add a tag"
          placeholder={tags.length === 0 ? "add…" : ""}
          maxLength={TAG_MAX_LENGTH}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            add(draft);
          }}
        />
      </div>
      <span className={styles.hint}>Enter adds a tag. Up to {max}.</span>
    </div>
  );
}
