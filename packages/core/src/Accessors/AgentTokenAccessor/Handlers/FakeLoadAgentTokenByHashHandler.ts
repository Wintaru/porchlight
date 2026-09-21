import type { IHandler } from "../../../Common/IHandler";
import type { FakeAgentTokenState } from "../FakeAgentTokenState";
import type { LoadAgentTokenByHashRequest } from "../Requests/LoadAgentTokenByHashRequest";
import { AgentTokenAccessFailedResponse } from "../Responses/AgentTokenAccessFailedResponse";
import { AgentTokenLoadedResponse } from "../Responses/AgentTokenLoadedResponse";
import { AgentTokenNotFoundResponse } from "../Responses/AgentTokenNotFoundResponse";

export class FakeLoadAgentTokenByHashHandler implements IHandler<
  LoadAgentTokenByHashRequest,
  AgentTokenLoadedResponse | AgentTokenNotFoundResponse | AgentTokenAccessFailedResponse
> {
  constructor(private readonly state: FakeAgentTokenState) {}

  handle(
    request: LoadAgentTokenByHashRequest,
  ): Promise<
    AgentTokenLoadedResponse | AgentTokenNotFoundResponse | AgentTokenAccessFailedResponse
  > {
    const { tokenHash, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new AgentTokenAccessFailedResponse(correlationId, "AGENT_TOKEN_FAKE_RESULT=fail"),
      );
    }
    const token = this.state.byHash(tokenHash);
    return Promise.resolve(
      token === undefined
        ? new AgentTokenNotFoundResponse(correlationId)
        : new AgentTokenLoadedResponse(correlationId, token),
    );
  }
}
