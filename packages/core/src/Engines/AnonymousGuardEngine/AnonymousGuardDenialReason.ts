// Why an anonymous submission was refused before it reached a store (D15). None of
// these tells the visitor which check failed: the Client maps every one of them to the
// same generic message, so a blocked visitor cannot distinguish a block from a busy
// rate limiter.
export const ANONYMOUS_GUARD_DENIAL_REASONS = [
  "turnstile-failed",
  "blocked",
  "rate-limited",
] as const;

export type AnonymousGuardDenialReason = (typeof ANONYMOUS_GUARD_DENIAL_REASONS)[number];
