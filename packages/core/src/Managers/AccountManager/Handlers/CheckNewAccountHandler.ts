import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { CountProfilesRequest } from "../../../Accessors/ProfileAccessor/Requests/CountProfilesRequest";
import { ProfileCountResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileCountResponse";
import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadSignUpPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadSignUpPolicyRequest";
import { SignUpPolicyLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SignUpPolicyLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { EnsureProfileOptions } from "../EnsureProfileOptions";
import { isSiteAdminEmail } from "../isSiteAdminEmail";
import type { CheckNewAccountRequest } from "../Requests/CheckNewAccountRequest";
import type { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import { NewAccountCheckedResponse } from "../Responses/NewAccountCheckedResponse";
import { unavailable } from "../unavailable";

type Result = NewAccountCheckedResponse | AccountUnavailableResponse;

// The EnsureProfile gate, asked ahead (#68). The admin email always gets in, or a site
// whose sign-up is closed could never be reopened by its owner.
export class CheckNewAccountHandler implements IHandler<CheckNewAccountRequest, Result> {
  constructor(
    private readonly profiles: IProfileAccessor,
    private readonly siteConfig: ISiteConfigAccessor,
    private readonly options: EnsureProfileOptions,
  ) {}

  async handle(request: CheckNewAccountRequest): Promise<Result> {
    const { correlationId, email, timestamp } = request;
    const context = { correlationId, timestamp };
    // The policy first: on an open site that is the whole answer, and the public form
    // costs one read.
    const signUp = await this.siteConfig.load(new LoadSignUpPolicyRequest(context));
    if (!(signUp instanceof SignUpPolicyLoadedResponse)) {
      return unavailable(correlationId, signUp, "siteConfig.load");
    }
    if (signUp.policy === "open") {
      return new NewAccountCheckedResponse(correlationId, true);
    }
    const counted = await this.profiles.load(new CountProfilesRequest(context));
    if (!(counted instanceof ProfileCountResponse)) {
      return unavailable(correlationId, counted, "profiles.load");
    }
    return new NewAccountCheckedResponse(
      correlationId,
      isSiteAdminEmail(this.options, counted.count, email),
    );
  }
}
