import type { AgentScope } from "../../Common/AgentScope";
import type { NewAgentTokenCredential } from "./NewAgentTokenCredential";

// The row to insert. The Manager has already validated the name and scopes and hashed
// the raw token; this Accessor only persists it.
export interface NewAgentToken {
  readonly ownerId: string;
  readonly name: string;
  readonly credential: NewAgentTokenCredential;
  readonly scopes: readonly AgentScope[];
  readonly expiresAt: Date | null;
}
