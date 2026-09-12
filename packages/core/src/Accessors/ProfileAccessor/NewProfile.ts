import type { TrustLevel } from "../../Common/TrustLevel";
import type { UserRole } from "../../Common/UserRole";

// What the Manager decides about a profile before its first write. Status and the
// timestamps come from the store's defaults.
export interface NewProfile {
  readonly id: string;
  readonly handle: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  readonly role: UserRole;
  readonly trustLevel: TrustLevel;
}
