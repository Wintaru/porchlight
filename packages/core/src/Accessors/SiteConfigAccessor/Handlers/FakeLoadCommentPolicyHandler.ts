import type { IHandler } from "../../../Common/IHandler";
import type { FakeSiteConfigState } from "../FakeSiteConfigState";
import type { LoadCommentPolicyRequest } from "../Requests/LoadCommentPolicyRequest";
import { CommentPolicyLoadedResponse } from "../Responses/CommentPolicyLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

export class FakeLoadCommentPolicyHandler implements IHandler<
  LoadCommentPolicyRequest,
  CommentPolicyLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly state: FakeSiteConfigState) {}

  handle(
    request: LoadCommentPolicyRequest,
  ): Promise<CommentPolicyLoadedResponse | SiteConfigAccessFailedResponse> {
    return Promise.resolve(
      this.state.failing
        ? new SiteConfigAccessFailedResponse(
            request.correlationId,
            "SITE_CONFIG_FAKE_RESULT=fail",
          )
        : new CommentPolicyLoadedResponse(request.correlationId, this.state.comments),
    );
  }
}
