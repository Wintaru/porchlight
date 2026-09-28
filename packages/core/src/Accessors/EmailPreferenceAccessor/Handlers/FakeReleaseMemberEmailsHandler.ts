import type { IHandler } from "../../../Common/IHandler";
import type { FakeEmailPreferenceState } from "../FakeEmailPreferenceState";
import type { ReleaseMemberEmailsRequest } from "../Requests/ReleaseMemberEmailsRequest";
import { EmailPreferenceAccessFailedResponse } from "../Responses/EmailPreferenceAccessFailedResponse";
import { MemberEmailsReleasedResponse } from "../Responses/MemberEmailsReleasedResponse";

export class FakeReleaseMemberEmailsHandler implements IHandler<
  ReleaseMemberEmailsRequest,
  MemberEmailsReleasedResponse | EmailPreferenceAccessFailedResponse
> {
  constructor(private readonly state: FakeEmailPreferenceState) {}

  handle(
    request: ReleaseMemberEmailsRequest,
  ): Promise<MemberEmailsReleasedResponse | EmailPreferenceAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new EmailPreferenceAccessFailedResponse(
          request.correlationId,
          "EMAIL_PREFERENCE_FAKE_RESULT=fail",
        ),
      );
    }
    this.state.released.push(...request.claims);
    this.state.due.push(...request.claims);
    return Promise.resolve(new MemberEmailsReleasedResponse(request.correlationId));
  }
}
