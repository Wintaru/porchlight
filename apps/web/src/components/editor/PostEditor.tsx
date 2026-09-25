"use client";

import type { Post, TrustLevel } from "@porchlight/core";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { autosavePost, previewPost, submitPost } from "@/app/write/actions";
import {
  SUMMARY_MAX_LENGTH,
  TAGS_MAX_COUNT,
  TITLE_MAX_LENGTH,
} from "@/app/write/parse-post-form";
import { errorTextFor } from "@/app/write/post-form-messages";
import { AttachmentPanel } from "./AttachmentPanel";
import { AUTOSAVE_DELAY_MS } from "./autosave-delay";
import { BodyEditor, type BodyInsert } from "./BodyEditor";
import { CoverPicker } from "./CoverPicker";
import { classNames } from "@/lib/class-names";
import styles from "./editor.module.css";
import { PreviewDialog, type PreviewState } from "./PreviewDialog";
import { TagInput } from "./TagInput";

interface PostEditorProps {
  readonly post?: Post;
  readonly canPublish: boolean;
  readonly trustLevel: TrustLevel;
  readonly heading: string;
  readonly notices?: ReactNode;
}

// The `mature` content note is the seeded `mature` tag (SPEC.md §7): the checkbox adds
// or removes it, and the chips never show it.
const MATURE_TAG = "mature";

// A save that takes longer than this is treated as failed, so a hung request can never
// keep the buttons locked. A late answer is ignored.
const AUTOSAVE_TIMEOUT_MS = 15_000;

type SaveState =
  | { readonly kind: "clean" }
  | { readonly kind: "dirty" }
  | { readonly kind: "saving" }
  | { readonly kind: "saved" }
  | { readonly kind: "failed"; readonly error: string };

// The Editor board: top bar, writing column, sidebar. One form, so Save and Publish
// carry every field. Autosave runs only while the post is new or a draft: a save on a
// published post edits it live, and that is a choice a person makes with the button.
export function PostEditor({
  post,
  canPublish,
  trustLevel,
  heading,
  notices,
}: PostEditorProps) {
  const [postId, setPostId] = useState(post?.id ?? "");
  const [title, setTitle] = useState(post?.title ?? "");
  const [tags, setTags] = useState<readonly string[]>(
    post?.tags.filter((tag) => tag.slug !== MATURE_TAG).map((tag) => tag.name) ?? [],
  );
  const [mature, setMature] = useState(
    post?.tags.some((tag) => tag.slug === MATURE_TAG) ?? false,
  );
  const [save, setSave] = useState<SaveState>({ kind: "clean" });
  // Counts edits, so the timer restarts on every keystroke and fires after the last. The
  // ref lets a finished save tell whether more edits arrived while it ran.
  const [edits, setEdits] = useState(0);
  const editsRef = useRef(0);
  const [preview, setPreview] = useState<PreviewState>({ kind: "closed" });
  // Set by a Save or Publish and never cleared: the redirect remounts the editor. It
  // stops the timer and the buttons, so one draft is never created twice.
  const [submitting, setSubmitting] = useState(false);
  // Bumped by every save attempt and every submit, so an autosave answer that arrives
  // after a newer attempt (or after a timeout) changes nothing.
  const generationRef = useRef(0);
  // The last payload the store accepted: an unchanged form is not sent again.
  const lastSavedRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const bodyRef = useRef(post?.bodyMd ?? "");
  const insertRef = useRef<((item: BodyInsert) => void) | null>(null);
  const isDraft = post === undefined || post.status === "draft";

  const markDirty = useCallback(() => {
    editsRef.current += 1;
    setEdits(editsRef.current);
    setSave((current) => (current.kind === "saving" ? current : { kind: "dirty" }));
  }, []);

  // The timer: a pause after the last change saves, when there is a title to save.
  useEffect(() => {
    if (!isDraft || submitting || save.kind !== "dirty") {
      return;
    }
    const timer = setTimeout(() => {
      const form = formRef.current;
      if (form === null) {
        return;
      }
      const formData = new FormData(form);
      const titleField = formData.get("title");
      if (typeof titleField !== "string" || titleField.trim() === "") {
        return;
      }
      const payload = serialize(formData);
      if (payload === lastSavedRef.current) {
        setSave({ kind: "saved" });
        return;
      }
      const savedEdits = editsRef.current;
      const generation = ++generationRef.current;
      const current = () => generation === generationRef.current;
      setSave({ kind: "saving" });
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("autosave timed out"));
        }, AUTOSAVE_TIMEOUT_MS);
      });
      Promise.race([autosavePost(formData), timeout]).then(
        (result) => {
          if (!current()) {
            return;
          }
          if (!result.ok) {
            setSave({ kind: "failed", error: result.error });
            return;
          }
          lastSavedRef.current = payload;
          if (postId === "") {
            // The draft exists now: a reload lands on its own page.
            window.history.replaceState(null, "", `/write/${result.postId}`);
          }
          setPostId(result.postId);
          setSave(
            editsRef.current === savedEdits ? { kind: "saved" } : { kind: "dirty" },
          );
        },
        (error: unknown) => {
          if (!current()) {
            return;
          }
          console.error("autosave failed", error);
          setSave({ kind: "failed", error: "unavailable" });
        },
      );
    }, AUTOSAVE_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [edits, isDraft, postId, save.kind, submitting]);

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (save.kind !== "dirty" && save.kind !== "failed") {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [save.kind]);

  const openPreview = () => {
    setPreview({ kind: "loading" });
    previewPost(bodyRef.current).then(
      (result) => {
        setPreview(
          result.ok ? { kind: "ready", bodyHtml: result.bodyHtml } : { kind: "failed" },
        );
      },
      (error: unknown) => {
        console.error("preview failed", error);
        setPreview({ kind: "failed" });
      },
    );
  };

  const allTags = mature ? [...tags, MATURE_TAG] : tags;
  const locked = submitting || save.kind === "saving";
  const status = statusText(save, isDraft, title);

  return (
    <form
      ref={formRef}
      action={submitPost}
      onChange={markDirty}
      onSubmit={() => {
        // A submit takes over from the timer; the redirect brings the saved state.
        generationRef.current += 1;
        setSubmitting(true);
        setSave({ kind: "clean" });
      }}
    >
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="tags" value={allTags.join(", ")} />
      <div className={styles.bar}>
        <h1 className={styles.crumb}>
          Write<span>/ {heading}</span>
        </h1>
        <div className={styles.barActions}>
          {status !== undefined && (
            <span
              className={styles.status}
              data-state={save.kind}
              data-testid="save-state"
            >
              {status}
            </span>
          )}
          <button type="button" className={styles.button} onClick={openPreview}>
            Preview
          </button>
          <button
            type="submit"
            name="intent"
            value="save"
            className={styles.button}
            disabled={locked}
          >
            {isDraft ? "Save draft" : "Save"}
          </button>
          {canPublish && (
            <button
              type="submit"
              name="intent"
              value="publish"
              className={classNames(styles.button, styles.primary)}
              disabled={locked}
            >
              Publish
            </button>
          )}
        </div>
      </div>
      {notices !== undefined && <div className={styles.notices}>{notices}</div>}
      <div className={styles.grid}>
        <div className={styles.column}>
          <input
            className={styles.title}
            type="text"
            name="title"
            aria-label="Title"
            placeholder="Title"
            value={title}
            maxLength={TITLE_MAX_LENGTH}
            required
            onChange={(event) => {
              setTitle(event.target.value);
            }}
          />
          <BodyEditor
            insertRef={insertRef}
            initialMarkdown={post?.bodyMd ?? ""}
            onChange={(markdown) => {
              bodyRef.current = markdown;
              markDirty();
            }}
          />
        </div>
        <aside className={styles.side}>
          <CoverPicker initialMediaId={post?.coverMediaId ?? null} onChange={markDirty} />
          <label className={styles.field}>
            <span className={styles.label}>Summary for the preview card</span>
            <input
              className={styles.input}
              type="text"
              name="summary"
              defaultValue={post?.summary ?? ""}
              maxLength={SUMMARY_MAX_LENGTH}
              placeholder="One line. Otherwise the first sentence is used."
            />
          </label>
          <TagInput
            tags={tags}
            max={TAGS_MAX_COUNT - (mature ? 1 : 0)}
            onChange={(next) => {
              setTags(next);
              markDirty();
            }}
          />
          <fieldset className={classNames(styles.field, styles.fieldset)}>
            <legend className={styles.label}>Visibility</legend>
            <div className={styles.choices}>
              <label className={styles.choice}>
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  defaultChecked={(post?.visibility ?? "public") === "public"}
                />
                Public · in the feed and in search
              </label>
              <label className={styles.choice}>
                <input
                  type="radio"
                  name="visibility"
                  value="unlisted"
                  defaultChecked={post?.visibility === "unlisted"}
                />
                Unlisted · only people with the link
              </label>
            </div>
          </fieldset>
          <div className={styles.field}>
            <span className={styles.label}>Content note</span>
            <label className={styles.choice}>
              <input
                type="checkbox"
                checked={mature}
                onChange={(event) => {
                  setMature(event.target.checked);
                }}
              />
              Mark as mature (blurred until clicked)
            </label>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Comments</span>
            <label className={styles.choice}>
              <input
                type="checkbox"
                name="commentsEnabled"
                defaultChecked={post?.commentsEnabled ?? true}
              />
              Allow comments
            </label>
          </div>
          <AttachmentPanel
            onInsert={(item) => {
              insertRef.current?.(item);
            }}
          />
          {trustLevel === "probation" && (
            <div className={styles.card} data-testid="probation-note">
              <strong>You are a new member</strong>
              <span className={styles.hint}>
                Your first posts wait for an admin to read them before they show. You will
                get a note either way.
              </span>
            </div>
          )}
        </aside>
      </div>
      <PreviewDialog
        state={preview}
        title={title}
        onClose={() => {
          setPreview({ kind: "closed" });
        }}
      />
    </form>
  );
}

// The form as one string, for "did anything change since the last save". Every field
// here is text; a file would need a different key.
function serialize(formData: FormData): string {
  return JSON.stringify(
    [...formData.entries()].map(([name, value]) => [
      name,
      typeof value === "string" ? value : value.name,
    ]),
  );
}

function statusText(
  save: SaveState,
  autosaves: boolean,
  title: string,
): string | undefined {
  switch (save.kind) {
    case "clean":
      return undefined;
    case "dirty":
      if (!autosaves) {
        return "Unsaved changes";
      }
      return title.trim() === "" ? "Add a title to save the draft" : "Unsaved changes";
    case "saving":
      return "Saving…";
    case "saved":
      return "Draft saved a moment ago";
    case "failed":
      return errorTextFor(save.error);
  }
}
