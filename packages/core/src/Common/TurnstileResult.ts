// Mirrors the `turnstile_result` enum in the schema (SPEC.md §7): "pass" when the
// visitor solved a challenge, "fail" is never stored (a failed challenge never reaches
// a store), "not_required" for a member, who never sees the widget.
export const TURNSTILE_RESULTS = ["pass", "fail", "not_required"] as const;

export type TurnstileResult = (typeof TURNSTILE_RESULTS)[number];
