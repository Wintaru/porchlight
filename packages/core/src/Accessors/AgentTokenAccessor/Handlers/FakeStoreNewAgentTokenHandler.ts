import type { AgentToken } from "../../../Common/AgentToken";
import type { IHandler } from "../../../Common/IHandler";
import type { FakeAgentTokenState } from "../FakeAgentTokenState";
import type { StoreNewAgentTokenRequest } from "../Requests/StoreNewAgentTokenRequest";
import { AgentTokenAccessFailedResponse } from "../Responses/AgentTokenAccessFailedResponse";
import { AgentTokenStoredResponse } from "../Responses/AgentTokenStoredResponse";

export class FakeStoreNewAgentTokenHandler implements IHandler<
  StoreNewAgentTokenRequest,
  AgentTokenStoredResponse | AgentTokenAccessFailedResponse
> {
  constructor(private readonly state: FakeAgentTokenState) {}

  handle(
    request: StoreNewAgentTokenRequest,
  ): Promise<AgentTokenStoredResponse | AgentTokenAccessFailedResponse> {
    const { token, timestamp, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new AgentTokenAccessFailedResponse(correlationId, "AGENT_TOKEN_FAKE_RESULT=fail"),
      );
    }
    const stored: AgentToken = {
      id: globalThis.crypto.randomUUID(),
      ownerId: token.ownerId,
      name: token.name,
      scopes: token.scopes,
      createdAt: timestamp,
      expiresAt: token.expiresAt,
      revokedAt: null,
      lastUsedAt: null,
      oauthClientId: token.credential.kind === "oauth" ? token.credential.clientId : null,
    };
    if (token.credential.kind === "oauth" && this.state.liveGrant(stored) !== undefined) {
      // The schema's partial unique index: one live grant per member and client.
      return Promise.resolve(
        new AgentTokenAccessFailedResponse(
          correlationId,
          "duplicate key value violates unique constraint",
        ),
      );
    }
    this.state.tokens.set(stored.id, stored);
    if (token.credential.kind === "hash") {
      this.state.hashes.set(token.credential.tokenHash, stored.id);
    }
    return Promise.resolve(new AgentTokenStoredResponse(correlationId, stored));
  }
}
