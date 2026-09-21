import type { AgentToken } from "../../Common/AgentToken";

// The fake's `agent_tokens` table, by id, with the hash beside each row (the domain
// record never carries it). `failing` makes every call answer
// AgentTokenAccessFailedResponse, for the error path.
export class FakeAgentTokenState {
  readonly tokens = new Map<string, AgentToken>();
  readonly hashes = new Map<string, string>();

  constructor(readonly failing = false) {}

  byHash(tokenHash: string): AgentToken | undefined {
    const id = this.hashes.get(tokenHash);
    return id === undefined ? undefined : this.tokens.get(id);
  }

  forOwner(ownerId: string): AgentToken[] {
    return [...this.tokens.values()]
      .filter((token) => token.ownerId === ownerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
