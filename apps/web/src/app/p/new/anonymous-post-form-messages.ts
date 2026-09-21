import type { CannotPostResponse } from "@porchlight/core";

import {
  type AnonymousPostFormError,
  SUMMARY_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from "./parse-anonymous-post-form";

// Every code `submitAnonymousPost` can redirect with. `guard-refused` covers all three
// AnonymousGuardDenialReason values with one sentence on purpose (D15): a visitor
// cannot tell a Turnstile failure from a block from a busy rate limiter.
type ErrorCode =
  | AnonymousPostFormError
  | CannotPostResponse["reason"]
  | "guard-refused"
  | "rejected-title"
  | "unavailable";

export const ERROR_TEXT: Readonly<Record<ErrorCode, string>> = {
  "title-blank": "A post needs a title.",
  "title-length": `A title is at most ${String(TITLE_MAX_LENGTH)} characters.`,
  "summary-length": `A summary is at most ${String(SUMMARY_MAX_LENGTH)} characters.`,
  "body-length": "The body is too long.",
  "rejected-title": "The title needs at least one letter or digit.",
  "guard-refused": "That could not be posted. Try again in a moment.",
  "posting-closed": "Anonymous posting is closed on this site right now.",
  "comments-closed": "Comments are closed here.",
  "agents-closed": "Agents are closed to this account on this site.",
  "signed-out": "Sign in to write.",
  "account-inactive": "This account cannot write right now.",
  "not-allowed": "This post is not yours to change.",
  unavailable: "The post could not be saved. Try again in a moment.",
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
