import type { IHandler } from "../../../Common/IHandler";
import type { FakeSiteConfigState } from "../FakeSiteConfigState";
import { AutoPromoteAfterApprovedPostsLoadedResponse } from "../Responses/AutoPromoteAfterApprovedPostsLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";
import type { LoadAutoPromoteAfterApprovedPostsRequest } from "../Requests/LoadAutoPromoteAfterApprovedPostsRequest";

export class FakeLoadAutoPromoteAfterApprovedPostsHandler implements IHandler<
  LoadAutoPromoteAfterApprovedPostsRequest,
  AutoPromoteAfterApprovedPostsLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly state: FakeSiteConfigState) {}

  handle(
    request: LoadAutoPromoteAfterApprovedPostsRequest,
  ): Promise<
    AutoPromoteAfterApprovedPostsLoadedResponse | SiteConfigAccessFailedResponse
  > {
    return Promise.resolve(
      this.state.failing
        ? new SiteConfigAccessFailedResponse(
            request.correlationId,
            "SITE_CONFIG_FAKE_RESULT=fail",
          )
        : new AutoPromoteAfterApprovedPostsLoadedResponse(
            request.correlationId,
            this.state.autoPromoteAfterApprovedPosts,
          ),
    );
  }
}
