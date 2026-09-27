import type { IInviteAccessor } from "../../../Accessors/InviteAccessor/IInviteAccessor";
import { CheckInviteRequest } from "../../../Accessors/InviteAccessor/Requests/CheckInviteRequest";
import { InviteCheckedResponse } from "../../../Accessors/InviteAccessor/Responses/InviteCheckedResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { CountProfilesRequest } from "../../../Accessors/ProfileAccessor/Requests/CountProfilesRequest";
import { ProfileCountResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileCountResponse";
import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadSignUpPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadSignUpPolicyRequest";
import { SignUpPolicyLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SignUpPolicyLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { EnsureProfileOptions } from "../EnsureProfileOptions";
import { inviteTokenHash } from "../inviteTokenHash";
import { isSiteAdminEmail } from "../isSiteAdminEmail";
import type { CheckNewAccountRequest } from "../Requests/CheckNewAccountRequest";
import type { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import { NewAccountCheckedResponse } from "../Responses/NewAccountCheckedResponse";
import { unavailable } from "../unavailable";

type Result = NewAccountCheckedResponse | AccountUnavailableResponse;

// The EnsureProfile gate, asked ahead (#68). The admin email always gets in, or a site
// whose sign-up is closed could never be reopened by its owner. On an invite-only site a
// live invite link lets a new address in too (#25).
export class CheckNewAccountHandler implements IHandler<CheckNewAccountRequest, Result> {
  constructor(
    private readonly profiles: IProfileAccessor,
    private readonly siteConfig: ISiteConfigAccessor,
    private readonly invites: IInviteAccessor,
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
    if (signUp.policy === "invite" && request.inviteToken !== null) {
      const checked = await this.invites.load(
        new CheckInviteRequest(await inviteTokenHash(request.inviteToken), context),
      );
      if (!(checked instanceof InviteCheckedResponse)) {
        return unavailable(correlationId, checked, "invites.load");
      }
      if (checked.live) {
        return new NewAccountCheckedResponse(correlationId, true);
      }
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
