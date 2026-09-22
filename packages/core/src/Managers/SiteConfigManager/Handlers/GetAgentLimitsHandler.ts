import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadAgentLimitsRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAgentLimitsRequest";
import { AgentLimitsLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AgentLimitsLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteConfigAccessFailedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { GetAgentLimitsRequest } from "../Requests/GetAgentLimitsRequest";
import { AgentLimitsResponse } from "../Responses/AgentLimitsResponse";
import { SiteConfigUnavailableResponse } from "../Responses/SiteConfigUnavailableResponse";

type Verdict = AgentLimitsResponse | SiteConfigUnavailableResponse;

// The daily caps, for the MCP door to tell a connecting agent. No permission check, the
// same shape as GetRegionHandler and GetAgentsPolicyHandler.
export class GetAgentLimitsHandler implements IHandler<GetAgentLimitsRequest, Verdict> {
  constructor(private readonly siteConfig: ISiteConfigAccessor) {}

  async handle(request: GetAgentLimitsRequest): Promise<Verdict> {
    const { correlationId } = request;
    const loaded = await this.siteConfig.load(
      new LoadAgentLimitsRequest({ correlationId }),
    );
    if (!(loaded instanceof AgentLimitsLoadedResponse)) {
      const reason =
        loaded instanceof SiteConfigAccessFailedResponse
          ? loaded.reason
          : `unexpected ${loaded.constructor.name} from load`;
      return new SiteConfigUnavailableResponse(correlationId, reason);
    }
    return new AgentLimitsResponse(correlationId, loaded.limits);
  }
}
