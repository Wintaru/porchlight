import type { IHandler } from "../../../Common/IHandler";
import type { FakeEmailPreferenceState } from "../FakeEmailPreferenceState";
import type { ClaimMemberEmailsRequest } from "../Requests/ClaimMemberEmailsRequest";
import { EmailPreferenceAccessFailedResponse } from "../Responses/EmailPreferenceAccessFailedResponse";
import { MemberEmailsClaimedResponse } from "../Responses/MemberEmailsClaimedResponse";

export class FakeClaimMemberEmailsHandler implements IHandler<
  ClaimMemberEmailsRequest,
  MemberEmailsClaimedResponse | EmailPreferenceAccessFailedResponse
> {
  constructor(private readonly state: FakeEmailPreferenceState) {}

  handle(
    request: ClaimMemberEmailsRequest,
  ): Promise<MemberEmailsClaimedResponse | EmailPreferenceAccessFailedResponse> {
    const { limit, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new EmailPreferenceAccessFailedResponse(
          correlationId,
          "EMAIL_PREFERENCE_FAKE_RESULT=fail",
        ),
      );
    }
    const claims = this.state.due.slice(0, limit);
    this.state.due = this.state.due.slice(limit);
    return Promise.resolve(new MemberEmailsClaimedResponse(correlationId, claims));
  }
}
