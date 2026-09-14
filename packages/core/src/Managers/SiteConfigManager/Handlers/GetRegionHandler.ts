import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadRegionRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadRegionRequest";
import { RegionLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/RegionLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteConfigAccessFailedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { GetRegionRequest } from "../Requests/GetRegionRequest";
import { REGION_PROFILES } from "../RegionProfiles";
import { SiteConfigUnavailableResponse } from "../Responses/SiteConfigUnavailableResponse";
import { RegionResponse } from "../Responses/RegionResponse";

type Verdict = RegionResponse | SiteConfigUnavailableResponse;

// The one `site_config.region` read a public page needs: which reporting rules apply,
// and the wording for them. No permission check — unlike `GetSiteConfigHandler`, this
// is not the admin snapshot.
export class GetRegionHandler implements IHandler<GetRegionRequest, Verdict> {
  constructor(private readonly siteConfig: ISiteConfigAccessor) {}

  async handle(request: GetRegionRequest): Promise<Verdict> {
    const { correlationId } = request;
    const loaded = await this.siteConfig.load(new LoadRegionRequest({ correlationId }));
    if (!(loaded instanceof RegionLoadedResponse)) {
      const reason =
        loaded instanceof SiteConfigAccessFailedResponse
          ? loaded.reason
          : `unexpected ${loaded.constructor.name} from load`;
      return new SiteConfigUnavailableResponse(correlationId, reason);
    }
    return new RegionResponse(
      correlationId,
      loaded.region,
      REGION_PROFILES[loaded.region],
    );
  }
}
