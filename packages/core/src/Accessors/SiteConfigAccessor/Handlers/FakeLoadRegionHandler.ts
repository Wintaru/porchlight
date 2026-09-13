import type { IHandler } from "../../../Common/IHandler";
import type { FakeSiteConfigState } from "../FakeSiteConfigState";
import type { LoadRegionRequest } from "../Requests/LoadRegionRequest";
import { RegionLoadedResponse } from "../Responses/RegionLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

export class FakeLoadRegionHandler implements IHandler<
  LoadRegionRequest,
  RegionLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly state: FakeSiteConfigState) {}

  handle(
    request: LoadRegionRequest,
  ): Promise<RegionLoadedResponse | SiteConfigAccessFailedResponse> {
    return Promise.resolve(
      this.state.failing
        ? new SiteConfigAccessFailedResponse(
            request.correlationId,
            "SITE_CONFIG_FAKE_RESULT=fail",
          )
        : new RegionLoadedResponse(request.correlationId, this.state.region),
    );
  }
}
