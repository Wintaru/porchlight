import type { IHandler } from "../../../Common/IHandler";
import type { FakeSiteConfigState } from "../FakeSiteConfigState";
import type { LoadAgentDisclosureRequest } from "../Requests/LoadAgentDisclosureRequest";
import { AgentDisclosureLoadedResponse } from "../Responses/AgentDisclosureLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

export class FakeLoadAgentDisclosureHandler implements IHandler<
  LoadAgentDisclosureRequest,
  AgentDisclosureLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly state: FakeSiteConfigState) {}

  handle(
    request: LoadAgentDisclosureRequest,
  ): Promise<AgentDisclosureLoadedResponse | SiteConfigAccessFailedResponse> {
    return Promise.resolve(
      this.state.failing
        ? new SiteConfigAccessFailedResponse(
            request.correlationId,
            "SITE_CONFIG_FAKE_RESULT=fail",
          )
        : new AgentDisclosureLoadedResponse(
            request.correlationId,
            this.state.agentDisclosure,
          ),
    );
  }
}
