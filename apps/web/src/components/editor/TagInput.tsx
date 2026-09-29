"use client";

import { type KeyboardEvent, useId, useRef, useState } from "react";

import { TAG_MAX_LENGTH } from "@/app/write/parse-post-form";
import { classNames } from "@/lib/class-names";
import styles from "./editor.module.css";
import { suggestTags } from "./tag-suggestions";

interface TagInputProps {
  readonly tags: readonly string[];
  // The site's public tags, offered as the member types so one topic keeps one name.
  readonly knownTags: readonly string[];
  // How many chips may exist: the parent may hold one slot for the content note.
  readonly max: number;
  readonly onChange: (tags: readonly string[]) => void;
}

// Tags as chips with an "add…" box, as on the board. Enter or a comma adds one,
// Backspace on an empty box removes the last. While the box has text, the known tags
// that match it drop down below: the arrow keys pick one and Enter or a click adds it.
// The parent owns the hidden `tags` field (it folds the content note in), so the parser
// and the Manager see what they always did.
export function TagInput({ tags, knownTags, max, onChange }: TagInputProps) {
  const [draft, setDraft] = useState("");
  // The highlighted suggestion, or -1 for none: then Enter adds the text as typed.
  const [active, setActive] = useState(-1);
  const [isListOpen, setIsListOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const listId = useId();
  const suggestions =
    isListOpen && tags.length < max ? suggestTags(knownTags, draft, tags) : [];
  const optionId = (index: number) => `${listId}-${String(index)}`;

  // A pasted "a, b" is two tags, as the form parser would read it.
  const add = (raw: string) => {
    const names = raw
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name !== "");
    setDraft("");
    setActive(-1);
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
    if (event.key === "ArrowDown" && !isListOpen) {
      event.preventDefault();
      setIsListOpen(true);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (suggestions.length === 0) {
        return;
      }
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      // The box itself sits past both ends, so the arrows can come back to the text.
      setActive((current) => {
        const next = current + step;
        if (next < -1) {
          return suggestions.length - 1;
        }
        return next >= suggestions.length ? -1 : next;
      });
    } else if (event.key === "Escape" && suggestions.length > 0) {
      event.preventDefault();
      setIsListOpen(false);
      setActive(-1);
    } else if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(suggestions[active] ?? draft);
    } else if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className={styles.field}>
      <span className={styles.label} id={labelId}>
        Tags
      </span>
      <div className={styles.suggestAnchor}>
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
            role="combobox"
            aria-label="Add a tag"
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
            aria-controls={listId}
            aria-activedescendant={
              suggestions[active] === undefined ? undefined : optionId(active)
            }
            autoComplete="off"
            placeholder={tags.length === 0 ? "add…" : ""}
            maxLength={TAG_MAX_LENGTH}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setActive(-1);
              setIsListOpen(true);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => {
              add(draft);
              setIsListOpen(false);
            }}
          />
        </div>
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching tags"
          className={styles.suggestions}
          hidden={suggestions.length === 0}
          // A press anywhere on the list keeps the focus in the box, so the blur does
          // not add the half-typed text as a tag of its own.
          onMouseDown={(event) => {
            event.preventDefault();
          }}
        >
          {suggestions.map((name, index) => (
            <li
              key={name}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              className={styles.suggestion}
              onClick={() => {
                add(name);
              }}
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
      <span className={styles.hint}>Enter adds a tag. Up to {max}.</span>
    </div>
  );
}
