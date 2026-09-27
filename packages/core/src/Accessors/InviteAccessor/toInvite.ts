import type { Tables } from "@porchlight/db";

import type { Invite } from "../../Common/Invite";

// Never `select *`: the token hash stays in the table.
export const INVITE_COLUMNS =
  "id, created_at, expires_at, max_uses, used_count, trust_level, revoked_at";

export type InviteRow = Pick<
  Tables<"invites">,
  | "id"
  | "created_at"
  | "expires_at"
  | "max_uses"
  | "used_count"
  | "trust_level"
  | "revoked_at"
>;

export function toInvite(row: InviteRow): Invite {
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    expiresAt: row.expires_at === null ? null : new Date(row.expires_at),
    maxUses: row.max_uses,
    usedCount: row.used_count,
    trustLevel: row.trust_level,
    revokedAt: row.revoked_at === null ? null : new Date(row.revoked_at),
  };
}
