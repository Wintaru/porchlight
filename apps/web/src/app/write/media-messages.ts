import type {
  MediaForbiddenResponse,
  MediaQuotaExceededResponse,
  MediaRejectedResponse,
} from "@porchlight/core";

// Every code the attachment panel's actions can answer with, derived from the Manager's
// own Response types rather than an Engine's reason type directly (the same choice
// `post-form-messages.ts` makes). Keyed by the unions the codes come from, so a new
// denial or rejection reason without a sentence here is a type error, not a generic
// "could not be uploaded" at runtime.
type MediaErrorCode =
  | MediaForbiddenResponse["reason"]
  | MediaRejectedResponse["reason"]
  | MediaQuotaExceededResponse["reason"]
  | "unavailable"
  | "refused";

export const MEDIA_ERROR_TEXT: Readonly<Record<MediaErrorCode, string>> = {
  "signed-out": "Sign in to attach a file.",
  "account-inactive": "This account cannot upload right now.",
  "not-allowed": "That file is not yours to change.",
  // Never reached from the attachment panel: neither D20 key gates an upload directly.
  "posting-closed": "Posting is closed to members on this site.",
  "comments-closed": "Comments are closed here.",
  "extension-not-allowed": "That file type is not allowed here.",
  "type-mismatch": "That file's contents do not match its name. It was not accepted.",
  "file-too-large": "That file is larger than this account's per-file limit.",
  "account-cap": "This account has reached its total upload limit.",
  "file-count-cap": "The upload limit for this action has been reached.",
  unavailable: "The file could not be uploaded. Try again in a moment.",
  // A locked scan verdict (SPEC.md §7, issue #31): never named as such, so an uploader
  // cannot tell a lock from any other refusal. Trying again will not change the answer.
  refused: "That file was not accepted.",
};

function isMediaErrorCode(code: string): code is MediaErrorCode {
  return Object.hasOwn(MEDIA_ERROR_TEXT, code);
}

export function mediaErrorTextFor(code: string): string {
  return isMediaErrorCode(code) ? MEDIA_ERROR_TEXT[code] : MEDIA_ERROR_TEXT.unavailable;
}
