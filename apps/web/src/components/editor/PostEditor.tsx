"use client";

import type { Post, TrustLevel } from "@porchlight/core";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import {
  autosavePost,
  checkDraft,
  previewPost,
  submitPost,
  unpublishPost,
} from "@/app/write/actions";
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
import { MATURE_TAG } from "@/lib/mature-tag";
import styles from "./editor.module.css";
import { CheckDialog, type CheckState } from "./CheckDialog";
import { PreviewDialog, type PreviewState } from "./PreviewDialog";
import { TagInput } from "./TagInput";

// The fields the editor shows, and nothing else: this is a client component, so every
// prop reaches the browser, and a Post carries text only its author may see (the
// agent's first draft, D22).
export type EditorPost = Pick<
  Post,
  | "id"
  | "title"
  | "bodyMd"
  | "summary"
  | "tags"
  | "visibility"
  | "commentsEnabled"
  | "coverMediaId"
  | "status"
  | "version"
>;

interface PostEditorProps {
  readonly post?: EditorPost;
  readonly canPublish: boolean;
  readonly canUnpublish?: boolean;
  readonly trustLevel: TrustLevel;
  readonly heading: string;
  readonly notices?: ReactNode;
}

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
  canUnpublish = false,
  trustLevel,
  heading,
  notices,
}: PostEditorProps) {
  const [postId, setPostId] = useState(post?.id ?? "");
  // The post's version as this page last saw it. Each autosave sends it and gets the new
  // one back, so a save that arrives after another write changes nothing (#100).
  const [version, setVersion] = useState<number | undefined>(post?.version);
  const adoptVersion = useCallback((next: number) => {
    setVersion((seen) => (seen === undefined || next > seen ? next : seen));
  }, []);
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
  const [check, setCheck] = useState<CheckState>({ kind: "closed" });
  // Bumped by every open and every close, so only the newest request's answer lands, and
  // an answer that arrives after a close cannot open the dialog again.
  const previewRequestRef = useRef(0);
  const checkRequestRef = useRef(0);
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
      const request = autosavePost(formData);
      // This tab's own write, even one that answers after the timeout or after a newer
      // attempt: its version is adopted, so the next autosave does not see its own late
      // write as someone else's change. Never lower: a foreign write after it would give
      // a higher version, and one before it would have refused it. A failure is reported
      // by the race below.
      request.then(
        (result) => {
          if (result.ok && result.postId === postId) {
            adoptVersion(result.version);
          }
        },
        () => undefined,
      );
      Promise.race([request, timeout]).then(
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
          adoptVersion(result.version);
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
  }, [adoptVersion, edits, isDraft, postId, save.kind, submitting]);

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
    const request = ++previewRequestRef.current;
    const current = () => request === previewRequestRef.current;
    setPreview({ kind: "loading" });
    previewPost(bodyRef.current).then(
      (result) => {
        if (!current()) {
          return;
        }
        setPreview(
          result.ok ? { kind: "ready", bodyHtml: result.bodyHtml } : { kind: "failed" },
        );
      },
      (error: unknown) => {
        console.error("preview failed", error);
        if (!current()) {
          return;
        }
        setPreview({ kind: "failed" });
      },
    );
  };

  const openCheck = () => {
    const request = ++checkRequestRef.current;
    const current = () => request === checkRequestRef.current;
    setCheck({ kind: "loading" });
    checkDraft(bodyRef.current).then(
      (result) => {
        if (!current()) {
          return;
        }
        setCheck(
          result.ok ? { kind: "ready", warnings: result.warnings } : { kind: "failed" },
        );
      },
      (error: unknown) => {
        console.error("draft check failed", error);
        if (!current()) {
          return;
        }
        setCheck({ kind: "failed" });
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
      <input type="hidden" name="version" value={version ?? ""} />
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
          <button type="button" className={styles.button} onClick={openCheck}>
            Check
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
          {canUnpublish && (
            // Unpublish sends no fields and the page remounts the editor from the
            // stored post, so it waits until the changes on the page are saved.
            <button
              type="submit"
              formAction={unpublishPost}
              className={styles.button}
              disabled={locked || save.kind === "dirty" || save.kind === "failed"}
            >
              Unpublish
            </button>
          )}
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
          <CoverPicker
            initialMediaId={post?.coverMediaId ?? null}
            onChange={markDirty}
            postId={postId}
          />
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
              <label className={styles.choice}>
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  defaultChecked={post?.visibility === "private"}
                />
                Private · only you, like a journal
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
            postId={postId}
            onInsert={(item) => {
              insertRef.current?.(item);
            }}
          />
          {trustLevel === "probation" && (
            <div className={styles.card} data-testid="probation-note">
              <strong>You are a new member</strong>
              <span className={styles.hint}>
                Your first posts wait for an admin to read them before they show. You will
                get a note either way. A private post goes up at once, since only you see
                it.
              </span>
            </div>
          )}
        </aside>
      </div>
      <CheckDialog
        state={check}
        onClose={() => {
          checkRequestRef.current += 1;
          setCheck({ kind: "closed" });
        }}
      />
      <PreviewDialog
        state={preview}
        title={title}
        onClose={() => {
          previewRequestRef.current += 1;
          setPreview({ kind: "closed" });
        }}
      />
    </form>
  );
}

// The form as one string, for "did anything change since the last save". Every field
// here is text; a file would need a different key. The version is left out: every save
// moves it, so with it no form would ever look unchanged.
function serialize(formData: FormData): string {
  return JSON.stringify(
    [...formData.entries()]
      .filter(([name]) => name !== "version")
      .map(([name, value]) => [name, typeof value === "string" ? value : value.name]),
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
