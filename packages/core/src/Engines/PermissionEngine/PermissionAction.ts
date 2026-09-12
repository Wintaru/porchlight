// Every action the PermissionEngine can rule on. Later issues add theirs here; the
// EvaluatePermissionHandler switches over this list exhaustively, so a new action with no
// rule is a type error, not a silent deny.
export const PERMISSION_ACTIONS = ["profile.edit"] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
