// Why an action was refused. The Client maps these to a status and a message; none of
// them leaks what the actor could not see.
export const PERMISSION_DENIAL_REASONS = [
  "signed-out",
  "account-inactive",
  "not-allowed",
] as const;

export type PermissionDenialReason = (typeof PERMISSION_DENIAL_REASONS)[number];
