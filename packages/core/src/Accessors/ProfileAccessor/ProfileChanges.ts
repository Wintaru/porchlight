import type { ProfileStatus } from "../../Common/ProfileStatus";
import type { TrustLevel } from "../../Common/TrustLevel";

// The fields a save may change. A missing field is left as it is; `null` clears it.
// `handle`/`displayName`/`bio`/`avatarUrl` are the member's own Settings board edits;
// `trustLevel` and `status` are ModerationManager's promote/suspend/ban actions (#11) —
// a member never sets those on themselves (PermissionEngine gates the callers, not this
// accessor).
export interface ProfileChanges {
  readonly handle?: string;
  readonly displayName?: string | null;
  readonly bio?: string | null;
  readonly avatarUrl?: string | null;
  readonly trustLevel?: TrustLevel;
  readonly status?: ProfileStatus;
}
