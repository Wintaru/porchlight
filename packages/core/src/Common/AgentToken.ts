import type { AgentScope } from "./AgentScope";

// A personal token as every layer above the accessor sees it (SPEC.md §17): never the
// hash, and never the raw value, which exists only in the CreateAgentToken response.
export interface AgentToken {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly scopes: readonly AgentScope[];
  readonly createdAt: Date;
  readonly expiresAt: Date | null;
  readonly revokedAt: Date | null;
  readonly lastUsedAt: Date | null;
}

// The schema's check on `agent_tokens.name`.
export const AGENT_TOKEN_NAME_MAX_LENGTH = 60;

// The raw token's prefix, so a leaked one is recognizable in a log or a scanner.
export const AGENT_TOKEN_PREFIX = "plt_";

// A token that is not revoked and not past its expiry at `now`.
export function isAgentTokenLive(token: AgentToken, now: Date): boolean {
  if (token.revokedAt !== null) {
    return false;
  }
  return token.expiresAt === null || token.expiresAt.getTime() > now.getTime();
}
