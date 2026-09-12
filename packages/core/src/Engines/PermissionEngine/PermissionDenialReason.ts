// Why an action was refused. The Client maps these to a status and a message; none of
// them leaks what the actor could not see. `posting-closed` is the D20 `posting` key
// saying this actor's standing may not write today.
export const PERMISSION_DENIAL_REASONS = [
  "signed-out",
  "account-inactive",
  "not-allowed",
  "posting-closed",
] as const;

export type PermissionDenialReason = (typeof PERMISSION_DENIAL_REASONS)[number];
