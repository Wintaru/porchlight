import type { IHandler } from "../../../Common/IHandler";
import type { FakeAgentTokenState } from "../FakeAgentTokenState";
import type { MarkAgentTokenRevokedRequest } from "../Requests/MarkAgentTokenRevokedRequest";
import { AgentTokenAccessFailedResponse } from "../Responses/AgentTokenAccessFailedResponse";
import { AgentTokenNotFoundResponse } from "../Responses/AgentTokenNotFoundResponse";
import { AgentTokenRevokedResponse } from "../Responses/AgentTokenRevokedResponse";

export class FakeMarkAgentTokenRevokedHandler implements IHandler<
  MarkAgentTokenRevokedRequest,
  AgentTokenRevokedResponse | AgentTokenNotFoundResponse | AgentTokenAccessFailedResponse
> {
  constructor(private readonly state: FakeAgentTokenState) {}

  handle(
    request: MarkAgentTokenRevokedRequest,
  ): Promise<
    | AgentTokenRevokedResponse
    | AgentTokenNotFoundResponse
    | AgentTokenAccessFailedResponse
  > {
    const { tokenId, ownerId, timestamp, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new AgentTokenAccessFailedResponse(correlationId, "AGENT_TOKEN_FAKE_RESULT=fail"),
      );
    }
    const token = this.state.tokens.get(tokenId);
    if (token?.ownerId !== ownerId) {
      return Promise.resolve(new AgentTokenNotFoundResponse(correlationId));
    }
    if (token.revokedAt === null) {
      this.state.tokens.set(tokenId, { ...token, revokedAt: timestamp });
    }
    return Promise.resolve(new AgentTokenRevokedResponse(correlationId));
  }
}
