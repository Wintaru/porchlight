import type {
  CannotPostResponse,
  PostRejectionReason,
  PostStatus,
} from "@porchlight/core";

import {
  type PostFormError,
  SUMMARY_MAX_LENGTH,
  TAG_MAX_LENGTH,
  TAGS_MAX_COUNT,
  TITLE_MAX_LENGTH,
} from "./parse-post-form";

// Every code the editor's actions can redirect with. Keyed by the unions the codes
// come from, so a new denial reason or rejection reason without a sentence here is a
// type error, not a generic "could not be saved" at runtime.
type ErrorCode =
  | PostFormError
  | CannotPostResponse["reason"]
  | `rejected-${PostRejectionReason}`
  | `not-publishable-${Exclude<PostStatus, "draft" | "pending" | "published">}`
  | "unavailable";

// What the editor says for each `?error=` and `?saved=` code its actions redirect with.
export const ERROR_TEXT: Readonly<Record<ErrorCode, string>> = {
  "title-blank": "A post needs a title.",
  "title-length": `A title is at most ${String(TITLE_MAX_LENGTH)} characters.`,
  "summary-length": `A summary is at most ${String(SUMMARY_MAX_LENGTH)} characters.`,
  "body-length": "The body is too long.",
  "tags-count": `At most ${String(TAGS_MAX_COUNT)} tags.`,
  "tag-length": `A tag is at most ${String(TAG_MAX_LENGTH)} characters.`,
  "rejected-title": "The title needs at least one letter or digit.",
  "rejected-tag": "Every tag needs at least one letter or digit.",
  "rejected-cover": "That file cannot be the cover. Choose one of your own images.",
  "posting-closed": "Posting is closed to members on this site.",
  // Never reached by a post action; the table is keyed by every denial reason.
  "comments-closed": "Comments are closed here.",
  "agents-closed": "Agents are closed to this account on this site.",
  "signed-out": "Sign in to write.",
  "account-inactive": "This account cannot write right now.",
  "not-allowed": "This post is not yours to change.",
  "not-publishable-rejected":
    "A moderator rejected this post. It cannot be published again.",
  "not-publishable-hidden": "A moderator hid this post. It cannot be published again.",
  "not-publishable-removed":
    "A moderator removed this post. It cannot be published again.",
  unavailable: "The post could not be saved. Try again in a moment.",
};

export const SAVED_TEXT: Readonly<Record<string, string>> = {
  draft: "Saved.",
  pending: "Saved and sent to the queue. It shows once a moderator approves it.",
  unpublished: "Taken down. It is a draft again.",
};

function isErrorCode(code: string): code is ErrorCode {
  return Object.hasOwn(ERROR_TEXT, code);
}

export function errorTextFor(code: string | undefined): string | undefined {
  if (code === undefined) {
    return undefined;
  }
  return isErrorCode(code) ? ERROR_TEXT[code] : ERROR_TEXT.unavailable;
}

export function savedTextFor(code: string | undefined): string | undefined {
  return code === undefined ? undefined : SAVED_TEXT[code];
}
