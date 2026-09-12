import type { AnonymousPostDraft } from "@porchlight/core";

// The edge of the anonymous form: trims, caps lengths, turns empty text into `null`
// where the shape allows it. Same limits `parse-post-form.ts` uses for a member's
// title and summary; the anonymous draft has no tags and no visibility choice
// (SPEC.md §4), so there is nothing to parse for either.
export const TITLE_MAX_LENGTH = 200;
export const SUMMARY_MAX_LENGTH = 200;
export const BODY_MAX_LENGTH = 100_000;

export const ANONYMOUS_POST_FORM_ERRORS = [
  "title-blank",
  "title-length",
  "summary-length",
  "body-length",
] as const;

export type AnonymousPostFormError = (typeof ANONYMOUS_POST_FORM_ERRORS)[number];

export type AnonymousPostFormResult =
  | { readonly ok: true; readonly draft: AnonymousPostDraft }
  | { readonly ok: false; readonly error: AnonymousPostFormError };

export function parseAnonymousPostForm(formData: FormData): AnonymousPostFormResult {
  const title = text(formData, "title");
  const bodyMd = textRaw(formData, "bodyMd");
  const summary = text(formData, "summary");
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
  return {
    ok: true,
    draft: { title, bodyMd, summary: summary === "" ? null : summary },
  };
}

function text(formData: FormData, field: string): string {
  return textRaw(formData, field).trim();
}

function textRaw(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}
