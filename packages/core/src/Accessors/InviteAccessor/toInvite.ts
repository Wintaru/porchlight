import type { Tables } from "@porchlight/db";

import type { Invite } from "../../Common/Invite";

// Never `select *`: the token hash stays in the table.
// `invite_is_live` is a computed column: the SQL function of that name (#92).
export const INVITE_COLUMNS =
  "id, created_at, expires_at, max_uses, used_count, trust_level, revoked_at, invite_is_live";

export type InviteRow = Pick<
  Tables<"invites">,
  | "id"
  | "created_at"
  | "expires_at"
  | "max_uses"
  | "used_count"
  | "trust_level"
  | "revoked_at"
  | "invite_is_live"
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
    // Null only if a column in the rule were null, which the table's constraints rule
    // out; "not live" is the safe reading all the same.
    live: row.invite_is_live === true,
  };
}
