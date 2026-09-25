import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadAgentDisclosureRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAgentDisclosureRequest";
import { AgentDisclosureLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AgentDisclosureLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteConfigAccessFailedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { GetAgentDisclosureRequest } from "../Requests/GetAgentDisclosureRequest";
import { AgentDisclosureResponse } from "../Responses/AgentDisclosureResponse";
import { SiteConfigUnavailableResponse } from "../Responses/SiteConfigUnavailableResponse";

type Verdict = AgentDisclosureResponse | SiteConfigUnavailableResponse;

// The one `site_config.agent_disclosure` read a post page needs. No permission check,
// the same shape as GetAgentsPolicyHandler: this is not the admin snapshot.
export class GetAgentDisclosureHandler implements IHandler<
  GetAgentDisclosureRequest,
  Verdict
> {
  constructor(private readonly siteConfig: ISiteConfigAccessor) {}

  async handle(request: GetAgentDisclosureRequest): Promise<Verdict> {
    const { correlationId } = request;
    const loaded = await this.siteConfig.load(
      new LoadAgentDisclosureRequest({ correlationId }),
    );
    if (!(loaded instanceof AgentDisclosureLoadedResponse)) {
      const reason =
        loaded instanceof SiteConfigAccessFailedResponse
          ? loaded.reason
          : `unexpected ${loaded.constructor.name} from load`;
      return new SiteConfigUnavailableResponse(correlationId, reason);
    }
    return new AgentDisclosureResponse(correlationId, loaded.disclosure);
  }
}
