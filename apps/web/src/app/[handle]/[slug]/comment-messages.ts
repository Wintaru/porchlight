import type {
  CannotCommentResponse,
  CommentDeletion,
  CommentRejectionReason,
  CommentStatus,
} from "@porchlight/core";

// Every code the post page's comment actions redirect with. Keyed by the unions the
// codes come from, so a new denial or rejection reason without a sentence here is a
// type error, not a generic "could not be saved" at runtime.
type CommentErrorCode =
  | CannotCommentResponse["reason"]
  | `rejected-${CommentRejectionReason}`
  | "no-such-comment"
  | "no-such-target"
  | "too-long"
  | "unavailable";

// What a successful action reports: the status a new comment landed in, or what a
// delete did.
type CommentNoticeCode = Extract<CommentStatus, "visible" | "pending"> | CommentDeletion;

const ERROR_TEXT: Readonly<Record<CommentErrorCode, string>> = {
  "signed-out": "Sign in to comment.",
  "account-inactive": "This account cannot comment right now.",
  "not-allowed": "That is not yours to change.",
  "posting-closed": "Posting is closed on this site.",
  "comments-closed": "Comments are closed here.",
  "rejected-empty-body": "A comment needs some words.",
  "rejected-no-such-post": "That post is gone.",
  "rejected-no-such-parent": "The comment you answered is gone.",
  "no-such-comment": "That comment is gone.",
  "no-such-target": "That is gone.",
  "too-long": "That comment is too long.",
  unavailable: "That did not go through. Try again in a moment.",
};

const NOTICE_TEXT: Readonly<Record<CommentNoticeCode, string>> = {
  visible: "Posted.",
  pending: "Sent to the queue. It shows once a moderator approves it.",
  removed: "Deleted.",
  tombstoned: "Deleted. The replies under it stay.",
};

function isErrorCode(code: string): code is CommentErrorCode {
  return Object.hasOwn(ERROR_TEXT, code);
}

export function commentErrorTextFor(code: string | undefined): string | undefined {
  if (code === undefined) {
    return undefined;
  }
  return isErrorCode(code) ? ERROR_TEXT[code] : ERROR_TEXT.unavailable;
}

function isNoticeCode(code: string): code is CommentNoticeCode {
  return Object.hasOwn(NOTICE_TEXT, code);
}

export function commentNoticeTextFor(code: string | undefined): string | undefined {
  if (code === undefined || !isNoticeCode(code)) {
    return undefined;
  }
  return NOTICE_TEXT[code];
}
