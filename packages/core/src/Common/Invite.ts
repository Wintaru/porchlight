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
}

// Whether a link still lets someone in at `now`.
export function isInviteLive(invite: Invite, now: Date): boolean {
  return (
    invite.revokedAt === null &&
    (invite.expiresAt === null || invite.expiresAt > now) &&
    (invite.maxUses === null || invite.usedCount < invite.maxUses)
  );
}
