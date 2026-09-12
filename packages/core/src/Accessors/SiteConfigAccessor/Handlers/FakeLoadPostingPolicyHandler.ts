import type { IHandler } from "../../../Common/IHandler";
import type { FakeSiteConfigState } from "../FakeSiteConfigState";
import type { LoadPostingPolicyRequest } from "../Requests/LoadPostingPolicyRequest";
import { PostingPolicyLoadedResponse } from "../Responses/PostingPolicyLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

export class FakeLoadPostingPolicyHandler implements IHandler<
  LoadPostingPolicyRequest,
  PostingPolicyLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly state: FakeSiteConfigState) {}

  handle(
    request: LoadPostingPolicyRequest,
  ): Promise<PostingPolicyLoadedResponse | SiteConfigAccessFailedResponse> {
    return Promise.resolve(
      this.state.failing
        ? new SiteConfigAccessFailedResponse(
            request.correlationId,
            "SITE_CONFIG_FAKE_RESULT=fail",
          )
        : new PostingPolicyLoadedResponse(request.correlationId, this.state.posting),
    );
  }
}
