import type { IHandler } from "../../../Common/IHandler";
import type { FakeSiteConfigState } from "../FakeSiteConfigState";
import type { LoadRawIpRetentionDaysRequest } from "../Requests/LoadRawIpRetentionDaysRequest";
import { RawIpRetentionDaysLoadedResponse } from "../Responses/RawIpRetentionDaysLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

export class FakeLoadRawIpRetentionDaysHandler implements IHandler<
  LoadRawIpRetentionDaysRequest,
  RawIpRetentionDaysLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly state: FakeSiteConfigState) {}

  handle(
    request: LoadRawIpRetentionDaysRequest,
  ): Promise<RawIpRetentionDaysLoadedResponse | SiteConfigAccessFailedResponse> {
    return Promise.resolve(
      this.state.failing
        ? new SiteConfigAccessFailedResponse(
            request.correlationId,
            "SITE_CONFIG_FAKE_RESULT=fail",
          )
        : new RawIpRetentionDaysLoadedResponse(
            request.correlationId,
            this.state.rawIpRetentionDays,
          ),
    );
  }
}
