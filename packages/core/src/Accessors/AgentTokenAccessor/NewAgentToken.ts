import type { AgentScope } from "../../Common/AgentScope";

// The row to insert. The Manager has already validated the name and scopes and hashed
// the raw token; this Accessor only persists it.
export interface NewAgentToken {
  readonly ownerId: string;
  readonly name: string;
  readonly tokenHash: string;
  readonly scopes: readonly AgentScope[];
  readonly expiresAt: Date | null;
}
