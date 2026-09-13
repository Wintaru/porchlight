import type { IHandler } from "../../../Common/IHandler";
import type { FakeSiteConfigState } from "../FakeSiteConfigState";
import type { LoadSiteIdentityRequest } from "../Requests/LoadSiteIdentityRequest";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";
import { SiteIdentityLoadedResponse } from "../Responses/SiteIdentityLoadedResponse";

export class FakeLoadSiteIdentityHandler implements IHandler<
  LoadSiteIdentityRequest,
  SiteIdentityLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly state: FakeSiteConfigState) {}

  handle(
    request: LoadSiteIdentityRequest,
  ): Promise<SiteIdentityLoadedResponse | SiteConfigAccessFailedResponse> {
    return Promise.resolve(
      this.state.failing
        ? new SiteConfigAccessFailedResponse(
            request.correlationId,
            "SITE_CONFIG_FAKE_RESULT=fail",
          )
        : new SiteIdentityLoadedResponse(request.correlationId, this.state.siteIdentity),
    );
  }
}
