import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadSiteIdentityRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadSiteIdentityRequest";
import { SiteIdentityLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteIdentityLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteConfigAccessFailedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { GetSiteIdentityRequest } from "../Requests/GetSiteIdentityRequest";
import { SiteConfigUnavailableResponse } from "../Responses/SiteConfigUnavailableResponse";
import { SiteIdentityResponse } from "../Responses/SiteIdentityResponse";

type Verdict = SiteIdentityResponse | SiteConfigUnavailableResponse;

// The one `site_config` read every public page needs: name, tagline, `/about` body.
// No permission check — unlike `GetSiteConfigHandler`, this is not the admin snapshot.
export class GetSiteIdentityHandler implements IHandler<GetSiteIdentityRequest, Verdict> {
  constructor(private readonly siteConfig: ISiteConfigAccessor) {}

  async handle(request: GetSiteIdentityRequest): Promise<Verdict> {
    const { correlationId } = request;
    const loaded = await this.siteConfig.load(
      new LoadSiteIdentityRequest({ correlationId }),
    );
    if (!(loaded instanceof SiteIdentityLoadedResponse)) {
      const reason =
        loaded instanceof SiteConfigAccessFailedResponse
          ? loaded.reason
          : `unexpected ${loaded.constructor.name} from load`;
      return new SiteConfigUnavailableResponse(correlationId, reason);
    }
    return new SiteIdentityResponse(correlationId, loaded.identity);
  }
}
