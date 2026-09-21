import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadAgentsPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAgentsPolicyRequest";
import { AgentsPolicyLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AgentsPolicyLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteConfigAccessFailedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { GetAgentsPolicyRequest } from "../Requests/GetAgentsPolicyRequest";
import { AgentsPolicyResponse } from "../Responses/AgentsPolicyResponse";
import { SiteConfigUnavailableResponse } from "../Responses/SiteConfigUnavailableResponse";

type Verdict = AgentsPolicyResponse | SiteConfigUnavailableResponse;

// The one `site_config.agents` read a member's settings page needs. No permission
// check, the same shape as GetRegionHandler: this is not the admin snapshot.
export class GetAgentsPolicyHandler implements IHandler<GetAgentsPolicyRequest, Verdict> {
  constructor(private readonly siteConfig: ISiteConfigAccessor) {}

  async handle(request: GetAgentsPolicyRequest): Promise<Verdict> {
    const { correlationId } = request;
    const loaded = await this.siteConfig.load(
      new LoadAgentsPolicyRequest({ correlationId }),
    );
    if (!(loaded instanceof AgentsPolicyLoadedResponse)) {
      const reason =
        loaded instanceof SiteConfigAccessFailedResponse
          ? loaded.reason
          : `unexpected ${loaded.constructor.name} from load`;
      return new SiteConfigUnavailableResponse(correlationId, reason);
    }
    return new AgentsPolicyResponse(correlationId, loaded.policy);
  }
}
