import type { PostDraft } from "@porchlight/core";

import { isEntityId } from "@/lib/entity-id";

// The edge of the editor form: trims, caps lengths, splits tags, and turns empty text
// into `null` where the column is nullable. The rules of a post (slug, HTML, who may
// write) belong to the PostManager; only the sizes are decided here.
export const TITLE_MAX_LENGTH = 200;
export const SUMMARY_MAX_LENGTH = 200;
export const BODY_MAX_LENGTH = 100_000;
export const TAGS_MAX_COUNT = 10;
export const TAG_MAX_LENGTH = 40;

export const POST_FORM_ERRORS = [
  "title-blank",
  "title-length",
  "summary-length",
  "body-length",
  "tags-count",
  "tag-length",
] as const;

export type PostFormError = (typeof POST_FORM_ERRORS)[number];

export type PostFormResult =
  | { readonly ok: true; readonly draft: PostDraft }
  | { readonly ok: false; readonly error: PostFormError };

export function parsePostForm(formData: FormData): PostFormResult {
  const title = text(formData, "title");
  const bodyMd = textRaw(formData, "bodyMd");
  const summary = text(formData, "summary");
  const tags = text(formData, "tags")
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");
  if (title === "") {
    return { ok: false, error: "title-blank" };
  }
  if (title.length > TITLE_MAX_LENGTH) {
    return { ok: false, error: "title-length" };
  }
  if (summary.length > SUMMARY_MAX_LENGTH) {
    return { ok: false, error: "summary-length" };
  }
  if (bodyMd.length > BODY_MAX_LENGTH) {
    return { ok: false, error: "body-length" };
  }
  if (tags.length > TAGS_MAX_COUNT) {
    return { ok: false, error: "tags-count" };
  }
  if (tags.some((tag) => tag.length > TAG_MAX_LENGTH)) {
    return { ok: false, error: "tag-length" };
  }
  return {
    ok: true,
    draft: {
      title,
      bodyMd,
      summary: summary === "" ? null : summary,
      tags,
      visibility: formData.get("visibility") === "unlisted" ? "unlisted" : "public",
      commentsEnabled: formData.get("commentsEnabled") === "on",
      coverMediaId: coverOf(formData),
    },
  };
}

// The cover picker's hidden field: an upload's id, or empty for no cover. Anything that
// is not an id reads as no cover; whether the id is the author's own image is the
// Manager's check.
function coverOf(formData: FormData): string | null {
  const value = formData.get("coverMediaId");
  return typeof value === "string" && isEntityId(value) ? value : null;
}

// What the submit button asked for. Two buttons share the form; the one clicked sends
// its own name. Anything else is a save.
export type PostFormIntent = "save" | "publish";

export function parseIntent(formData: FormData): PostFormIntent {
  return formData.get("intent") === "publish" ? "publish" : "save";
}

function text(formData: FormData, name: string): string {
  return textRaw(formData, name).trim();
}

// Markdown keeps its leading and trailing whitespace: a trailing newline or an indented
// first line can be part of the content. Only line endings are normalized.
function textRaw(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.replace(/\r\n/g, "\n") : "";
}
