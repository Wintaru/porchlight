import type { IHandler } from "../../../Common/IHandler";
import type { FakeEmailPreferenceState } from "../FakeEmailPreferenceState";
import type { StoreEmailPreferenceRequest } from "../Requests/StoreEmailPreferenceRequest";
import { EmailPreferenceAccessFailedResponse } from "../Responses/EmailPreferenceAccessFailedResponse";
import { EmailPreferenceStoredResponse } from "../Responses/EmailPreferenceStoredResponse";

export class FakeStoreEmailPreferenceHandler implements IHandler<
  StoreEmailPreferenceRequest,
  EmailPreferenceStoredResponse | EmailPreferenceAccessFailedResponse
> {
  constructor(private readonly state: FakeEmailPreferenceState) {}

  handle(
    request: StoreEmailPreferenceRequest,
  ): Promise<EmailPreferenceStoredResponse | EmailPreferenceAccessFailedResponse> {
    const { profileId, preference, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new EmailPreferenceAccessFailedResponse(
          correlationId,
          "EMAIL_PREFERENCE_FAKE_RESULT=fail",
        ),
      );
    }
    this.state.preferences.set(profileId, preference);
    return Promise.resolve(new EmailPreferenceStoredResponse(correlationId));
  }
}
