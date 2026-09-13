import type { IHandler } from "../../../Common/IHandler";
import type { FakeSiteConfigState } from "../FakeSiteConfigState";
import type { LoadSignUpPolicyRequest } from "../Requests/LoadSignUpPolicyRequest";
import { SignUpPolicyLoadedResponse } from "../Responses/SignUpPolicyLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

export class FakeLoadSignUpPolicyHandler implements IHandler<
  LoadSignUpPolicyRequest,
  SignUpPolicyLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly state: FakeSiteConfigState) {}

  handle(
    request: LoadSignUpPolicyRequest,
  ): Promise<SignUpPolicyLoadedResponse | SiteConfigAccessFailedResponse> {
    return Promise.resolve(
      this.state.failing
        ? new SiteConfigAccessFailedResponse(
            request.correlationId,
            "SITE_CONFIG_FAKE_RESULT=fail",
          )
        : new SignUpPolicyLoadedResponse(request.correlationId, this.state.signUp),
    );
  }
}
