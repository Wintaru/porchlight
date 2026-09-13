import type { IHandler } from "../../../Common/IHandler";
import type { FakeSiteConfigState } from "../FakeSiteConfigState";
import type { LoadModerationThresholdsRequest } from "../Requests/LoadModerationThresholdsRequest";
import { ModerationThresholdsLoadedResponse } from "../Responses/ModerationThresholdsLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

export class FakeLoadModerationThresholdsHandler implements IHandler<
  LoadModerationThresholdsRequest,
  ModerationThresholdsLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly state: FakeSiteConfigState) {}

  handle(
    request: LoadModerationThresholdsRequest,
  ): Promise<ModerationThresholdsLoadedResponse | SiteConfigAccessFailedResponse> {
    return Promise.resolve(
      this.state.failing
        ? new SiteConfigAccessFailedResponse(
            request.correlationId,
            "SITE_CONFIG_FAKE_RESULT=fail",
          )
        : new ModerationThresholdsLoadedResponse(
            request.correlationId,
            this.state.moderationThresholds,
          ),
    );
  }
}
