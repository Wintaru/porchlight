import type { AgentToken } from "../../../Common/AgentToken";
import type { IHandler } from "../../../Common/IHandler";
import type { FakeAgentTokenState } from "../FakeAgentTokenState";
import type { ReplaceOAuthGrantRequest } from "../Requests/ReplaceOAuthGrantRequest";
import { AgentTokenAccessFailedResponse } from "../Responses/AgentTokenAccessFailedResponse";
import { AgentTokenStoredResponse } from "../Responses/AgentTokenStoredResponse";

// The fake runs on one thread, so the revoke and the insert cannot interleave with
// another call: the same one-step replace the SQL function makes with a lock.
export class FakeReplaceOAuthGrantHandler implements IHandler<
  ReplaceOAuthGrantRequest,
  AgentTokenStoredResponse | AgentTokenAccessFailedResponse
> {
  constructor(private readonly state: FakeAgentTokenState) {}

  handle(
    request: ReplaceOAuthGrantRequest,
  ): Promise<AgentTokenStoredResponse | AgentTokenAccessFailedResponse> {
    const { ownerId, clientId, name, scopes, timestamp, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new AgentTokenAccessFailedResponse(correlationId, "AGENT_TOKEN_FAKE_RESULT=fail"),
      );
    }
    const earlier = this.state.liveGrant({ ownerId, oauthClientId: clientId });
    if (earlier !== undefined) {
      this.state.tokens.set(earlier.id, { ...earlier, revokedAt: timestamp });
    }
    const stored: AgentToken = {
      id: globalThis.crypto.randomUUID(),
      ownerId,
      name,
      scopes,
      createdAt: timestamp,
      expiresAt: null,
      revokedAt: null,
      lastUsedAt: null,
      oauthClientId: clientId,
    };
    this.state.tokens.set(stored.id, stored);
    return Promise.resolve(new AgentTokenStoredResponse(correlationId, stored));
  }
}
