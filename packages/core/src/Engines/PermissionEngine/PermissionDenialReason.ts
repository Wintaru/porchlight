// Why an action was refused. The Client maps these to a status and a message; none of
// them leaks what the actor could not see. `posting-closed` is the D20 `posting` key
// saying this actor's standing may not write today; `comments-closed` is the same for
// the `comments` key, or the post's own `comments_enabled` switch; `agents-closed` is
// the `agents` key saying this member's agent may not act today (D22).
export const PERMISSION_DENIAL_REASONS = [
  "signed-out",
  "account-inactive",
  "not-allowed",
  "posting-closed",
  "comments-closed",
  "agents-closed",
] as const;

export type PermissionDenialReason = (typeof PERMISSION_DENIAL_REASONS)[number];
