import type { IHandler } from "../../../Common/IHandler";
import type { FakeEmailPreferenceState } from "../FakeEmailPreferenceState";
import type { ReleaseMemberEmailRequest } from "../Requests/ReleaseMemberEmailRequest";
import { EmailPreferenceAccessFailedResponse } from "../Responses/EmailPreferenceAccessFailedResponse";
import { MemberEmailReleasedResponse } from "../Responses/MemberEmailReleasedResponse";

export class FakeReleaseMemberEmailHandler implements IHandler<
  ReleaseMemberEmailRequest,
  MemberEmailReleasedResponse | EmailPreferenceAccessFailedResponse
> {
  constructor(private readonly state: FakeEmailPreferenceState) {}

  handle(
    request: ReleaseMemberEmailRequest,
  ): Promise<MemberEmailReleasedResponse | EmailPreferenceAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new EmailPreferenceAccessFailedResponse(
          request.correlationId,
          "EMAIL_PREFERENCE_FAKE_RESULT=fail",
        ),
      );
    }
    this.state.released.push(request.claim);
    this.state.due.push(request.claim);
    return Promise.resolve(new MemberEmailReleasedResponse(request.correlationId));
  }
}
