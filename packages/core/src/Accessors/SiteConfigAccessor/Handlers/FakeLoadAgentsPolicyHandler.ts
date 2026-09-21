import type { IHandler } from "../../../Common/IHandler";
import type { FakeSiteConfigState } from "../FakeSiteConfigState";
import type { LoadAgentsPolicyRequest } from "../Requests/LoadAgentsPolicyRequest";
import { AgentsPolicyLoadedResponse } from "../Responses/AgentsPolicyLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

export class FakeLoadAgentsPolicyHandler implements IHandler<
  LoadAgentsPolicyRequest,
  AgentsPolicyLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly state: FakeSiteConfigState) {}

  handle(
    request: LoadAgentsPolicyRequest,
  ): Promise<AgentsPolicyLoadedResponse | SiteConfigAccessFailedResponse> {
    return Promise.resolve(
      this.state.failing
        ? new SiteConfigAccessFailedResponse(
            request.correlationId,
            "SITE_CONFIG_FAKE_RESULT=fail",
          )
        : new AgentsPolicyLoadedResponse(request.correlationId, this.state.agents),
    );
  }
}
