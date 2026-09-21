import type { Tables } from "@porchlight/db";

import type { AgentToken } from "../../Common/AgentToken";

// Never `select *`, and never the hash: the columns here are what leaves the accessor.
export const AGENT_TOKEN_COLUMNS =
  "id, owner_id, name, scopes, created_at, expires_at, revoked_at, last_used_at";

export type AgentTokenRow = Pick<
  Tables<"agent_tokens">,
  | "id"
  | "owner_id"
  | "name"
  | "scopes"
  | "created_at"
  | "expires_at"
  | "revoked_at"
  | "last_used_at"
>;

// The domain scope list in Common restates the schema's enum, because Common cannot
// import packages/db. toAgentToken.test.ts checks the two against each other.
export function toAgentToken(row: AgentTokenRow): AgentToken {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    scopes: row.scopes,
    createdAt: new Date(row.created_at),
    expiresAt: row.expires_at === null ? null : new Date(row.expires_at),
    revokedAt: row.revoked_at === null ? null : new Date(row.revoked_at),
    lastUsedAt: row.last_used_at === null ? null : new Date(row.last_used_at),
  };
}
