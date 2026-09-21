import type { IHandler } from "../../../Common/IHandler";
import type { FakeAgentTokenState } from "../FakeAgentTokenState";
import type { TouchAgentTokenRequest } from "../Requests/TouchAgentTokenRequest";
import { AgentTokenAccessFailedResponse } from "../Responses/AgentTokenAccessFailedResponse";
import { AgentTokenTouchedResponse } from "../Responses/AgentTokenTouchedResponse";

export class FakeTouchAgentTokenHandler implements IHandler<
  TouchAgentTokenRequest,
  AgentTokenTouchedResponse | AgentTokenAccessFailedResponse
> {
  constructor(private readonly state: FakeAgentTokenState) {}

  handle(
    request: TouchAgentTokenRequest,
  ): Promise<AgentTokenTouchedResponse | AgentTokenAccessFailedResponse> {
    const { tokenId, timestamp, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new AgentTokenAccessFailedResponse(correlationId, "AGENT_TOKEN_FAKE_RESULT=fail"),
      );
    }
    const token = this.state.tokens.get(tokenId);
    if (token !== undefined) {
      this.state.tokens.set(tokenId, { ...token, lastUsedAt: timestamp });
    }
    return Promise.resolve(new AgentTokenTouchedResponse(correlationId));
  }
}
