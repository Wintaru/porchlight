import type { TrustLevel } from "./TrustLevel";

// An invite link as the admin page lists it (#25). The token is never here: it is shown
// once when the link is made, and only its hash is kept.
export interface Invite {
  readonly id: string;
  readonly createdAt: Date;
  // Null: never expires.
  readonly expiresAt: Date | null;
  // Null: no limit.
  readonly maxUses: number | null;
  readonly usedCount: number;
  readonly trustLevel: TrustLevel;
  readonly revokedAt: Date | null;
  // Whether the link still lets someone in, as the database's `invite_is_live` answered
  // when this was read (#92). The rule lives in SQL only.
  readonly live: boolean;
}
