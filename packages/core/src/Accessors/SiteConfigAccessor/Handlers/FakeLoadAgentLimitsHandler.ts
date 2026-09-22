import type { IHandler } from "../../../Common/IHandler";
import type { FakeSiteConfigState } from "../FakeSiteConfigState";
import type { LoadAgentLimitsRequest } from "../Requests/LoadAgentLimitsRequest";
import { AgentLimitsLoadedResponse } from "../Responses/AgentLimitsLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

export class FakeLoadAgentLimitsHandler implements IHandler<
  LoadAgentLimitsRequest,
  AgentLimitsLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly state: FakeSiteConfigState) {}

  handle(
    request: LoadAgentLimitsRequest,
  ): Promise<AgentLimitsLoadedResponse | SiteConfigAccessFailedResponse> {
    return Promise.resolve(
      this.state.failing
        ? new SiteConfigAccessFailedResponse(
            request.correlationId,
            "SITE_CONFIG_FAKE_RESULT=fail",
          )
        : new AgentLimitsLoadedResponse(request.correlationId, this.state.agentLimits),
    );
  }
}
