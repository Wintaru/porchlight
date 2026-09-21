import type { IHandler } from "../../../Common/IHandler";
import type { FakeAgentTokenState } from "../FakeAgentTokenState";
import type { ListAgentTokensByOwnerRequest } from "../Requests/ListAgentTokensByOwnerRequest";
import { AgentTokenAccessFailedResponse } from "../Responses/AgentTokenAccessFailedResponse";
import { AgentTokensLoadedResponse } from "../Responses/AgentTokensLoadedResponse";

export class FakeListAgentTokensByOwnerHandler implements IHandler<
  ListAgentTokensByOwnerRequest,
  AgentTokensLoadedResponse | AgentTokenAccessFailedResponse
> {
  constructor(private readonly state: FakeAgentTokenState) {}

  handle(
    request: ListAgentTokensByOwnerRequest,
  ): Promise<AgentTokensLoadedResponse | AgentTokenAccessFailedResponse> {
    const { ownerId, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new AgentTokenAccessFailedResponse(correlationId, "AGENT_TOKEN_FAKE_RESULT=fail"),
      );
    }
    return Promise.resolve(
      new AgentTokensLoadedResponse(correlationId, this.state.forOwner(ownerId)),
    );
  }
}
