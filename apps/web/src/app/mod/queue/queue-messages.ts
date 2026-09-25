import type { ModerationForbiddenResponse } from "@porchlight/core";

// Every code the queue's actions redirect with as `?error=`. Keyed by the union the
// codes come from, so a new denial reason without a sentence here is a type error, not
// a raw code shown to a moderator.
export type QueueErrorCode =
  ModerationForbiddenResponse["reason"] | "reason-required" | "unavailable";

const ERROR_TEXT: Readonly<Record<QueueErrorCode, string>> = {
  "signed-out": "Sign in to moderate.",
  "account-inactive": "This account cannot moderate right now.",
  "not-allowed": "That is not yours to decide.",
  "posting-closed": "Posting is closed on this site.",
  "comments-closed": "Comments are closed here.",
  "agents-closed": "Agents are closed to this account on this site.",
  "reason-required": "A rejection needs a reason. The author sees it.",
  unavailable: "That did not go through. Try again in a moment.",
};

// Every outcome a staff action reports back as `?done=`. The pages key their sentences
// by it, so a misspelt outcome is a type error rather than a silent "Done."
export type StaffOutcome =
  "approved" | "rejected" | "hidden" | "removed" | "escalated" | "dismissed" | "blocked";

function isErrorCode(code: string): code is QueueErrorCode {
  return Object.hasOwn(ERROR_TEXT, code);
}

// A code this page never sends (a hand-edited URL) reads as the generic failure.
export function queueErrorTextFor(code: string): string {
  return isErrorCode(code) ? ERROR_TEXT[code] : ERROR_TEXT.unavailable;
}
