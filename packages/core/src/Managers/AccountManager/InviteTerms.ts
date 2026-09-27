import type { TrustLevel } from "../../Common/TrustLevel";

// What an admin chooses when making an invite link (#25). Null days: never expires;
// null uses: no limit.
export interface InviteTerms {
  readonly expiresInDays: number | null;
  readonly maxUses: number | null;
  readonly trustLevel: TrustLevel;
}

// The bounds the admin page offers, checked again here since a form can send anything.
export const INVITE_MAX_DAYS = 365;
export const INVITE_MAX_USES = 1000;
