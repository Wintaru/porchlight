import { DEFAULT_EMAIL_PREFERENCE } from "../../../Common/EmailPreference";
import type { IHandler } from "../../../Common/IHandler";
import type { FakeEmailPreferenceState } from "../FakeEmailPreferenceState";
import type { StoreMemberUnsubscribeRequest } from "../Requests/StoreMemberUnsubscribeRequest";
import { EmailPreferenceAccessFailedResponse } from "../Responses/EmailPreferenceAccessFailedResponse";
import { MemberUnsubscribedResponse } from "../Responses/MemberUnsubscribedResponse";

export class FakeStoreMemberUnsubscribeHandler implements IHandler<
  StoreMemberUnsubscribeRequest,
  MemberUnsubscribedResponse | EmailPreferenceAccessFailedResponse
> {
  constructor(private readonly state: FakeEmailPreferenceState) {}

  handle(
    request: StoreMemberUnsubscribeRequest,
  ): Promise<MemberUnsubscribedResponse | EmailPreferenceAccessFailedResponse> {
    const { token, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new EmailPreferenceAccessFailedResponse(
          correlationId,
          "EMAIL_PREFERENCE_FAKE_RESULT=fail",
        ),
      );
    }
    const profileId = this.state.tokens.get(token);
    if (profileId !== undefined) {
      this.state.preferences.set(profileId, DEFAULT_EMAIL_PREFERENCE);
    }
    return Promise.resolve(
      new MemberUnsubscribedResponse(correlationId, profileId !== undefined),
    );
  }
}
