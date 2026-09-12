import type { IHandler } from "../../../Common/IHandler";
import type { FakeSiteConfigState } from "../FakeSiteConfigState";
import type { LoadAnonymousUploadCapRequest } from "../Requests/LoadAnonymousUploadCapRequest";
import { AnonymousUploadCapLoadedResponse } from "../Responses/AnonymousUploadCapLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

export class FakeLoadAnonymousUploadCapHandler implements IHandler<
  LoadAnonymousUploadCapRequest,
  AnonymousUploadCapLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly state: FakeSiteConfigState) {}

  handle(
    request: LoadAnonymousUploadCapRequest,
  ): Promise<AnonymousUploadCapLoadedResponse | SiteConfigAccessFailedResponse> {
    return Promise.resolve(
      this.state.failing
        ? new SiteConfigAccessFailedResponse(
            request.correlationId,
            "SITE_CONFIG_FAKE_RESULT=fail",
          )
        : new AnonymousUploadCapLoadedResponse(
            request.correlationId,
            this.state.anonymousUploadCap,
          ),
    );
  }
}
