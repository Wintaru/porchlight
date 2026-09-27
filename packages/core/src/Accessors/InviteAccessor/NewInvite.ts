import type { TrustLevel } from "../../Common/TrustLevel";

// What StoreNewInvite writes. The Manager hashes the token before it gets here.
export interface NewInvite {
  readonly tokenHash: string;
  readonly createdBy: string;
  readonly expiresAt: Date | null;
  readonly maxUses: number | null;
  readonly trustLevel: TrustLevel;
}
