import type { IHandler } from "../../../Common/IHandler";
import type { FakeAgentTokenState } from "../FakeAgentTokenState";
import type { LoadLiveOAuthGrantRequest } from "../Requests/LoadLiveOAuthGrantRequest";
import { AgentTokenAccessFailedResponse } from "../Responses/AgentTokenAccessFailedResponse";
import { AgentTokenLoadedResponse } from "../Responses/AgentTokenLoadedResponse";
import { AgentTokenNotFoundResponse } from "../Responses/AgentTokenNotFoundResponse";

export class FakeLoadLiveOAuthGrantHandler implements IHandler<
  LoadLiveOAuthGrantRequest,
  AgentTokenLoadedResponse | AgentTokenNotFoundResponse | AgentTokenAccessFailedResponse
> {
  constructor(private readonly state: FakeAgentTokenState) {}

  handle(
    request: LoadLiveOAuthGrantRequest,
  ): Promise<
    AgentTokenLoadedResponse | AgentTokenNotFoundResponse | AgentTokenAccessFailedResponse
  > {
    const { ownerId, clientId, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new AgentTokenAccessFailedResponse(correlationId, "AGENT_TOKEN_FAKE_RESULT=fail"),
      );
    }
    const token = this.state.liveGrant({ ownerId, oauthClientId: clientId });
    return Promise.resolve(
      token === undefined
        ? new AgentTokenNotFoundResponse(correlationId)
        : new AgentTokenLoadedResponse(correlationId, token),
    );
  }
}
