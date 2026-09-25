export const REPORT_DETAILS_MAX_LENGTH = 1_000;

// The report page's error sentences, keyed by the codes the Server Function sends.
// A guard refusal never says which check failed (D15): a blocked visitor reads the
// same words as one who failed the challenge.
const ERROR_TEXT = {
  "reason-required": "Choose a reason for the report.",
  "too-long": "Keep the details under 1,000 characters.",
  guard: "That report could not be sent. Wait a little and try again.",
  gone: "That post or comment is no longer here.",
  "not-allowed": "Your account cannot send reports right now.",
  unavailable: "The report could not be sent. Try again in a moment.",
} as const;

export type ReportErrorCode = keyof typeof ERROR_TEXT;

export function reportErrorTextFor(code: string): string {
  return isReportErrorCode(code) ? ERROR_TEXT[code] : ERROR_TEXT.unavailable;
}

function isReportErrorCode(code: string): code is ReportErrorCode {
  return Object.hasOwn(ERROR_TEXT, code);
}
