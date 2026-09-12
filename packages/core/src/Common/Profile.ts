import type { ProfileStatus } from "./ProfileStatus";
import type { TrustLevel } from "./TrustLevel";
import type { UserRole } from "./UserRole";

// A member as every layer sees them. The Accessor maps the `profiles` row to this shape,
// so no layer above it knows the column names. `id` is the auth user id.
export interface Profile {
  readonly id: string;
  readonly handle: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  readonly bio: string | null;
  readonly role: UserRole;
  readonly trustLevel: TrustLevel;
  readonly status: ProfileStatus;
  readonly createdAt: Date;
}
