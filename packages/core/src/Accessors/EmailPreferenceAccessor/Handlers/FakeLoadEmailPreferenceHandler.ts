import { DEFAULT_EMAIL_PREFERENCE } from "../../../Common/EmailPreference";
import type { IHandler } from "../../../Common/IHandler";
import type { FakeEmailPreferenceState } from "../FakeEmailPreferenceState";
import type { LoadEmailPreferenceRequest } from "../Requests/LoadEmailPreferenceRequest";
import { EmailPreferenceAccessFailedResponse } from "../Responses/EmailPreferenceAccessFailedResponse";
import { EmailPreferenceLoadedResponse } from "../Responses/EmailPreferenceLoadedResponse";

export class FakeLoadEmailPreferenceHandler implements IHandler<
  LoadEmailPreferenceRequest,
  EmailPreferenceLoadedResponse | EmailPreferenceAccessFailedResponse
> {
  constructor(private readonly state: FakeEmailPreferenceState) {}

  handle(
    request: LoadEmailPreferenceRequest,
  ): Promise<EmailPreferenceLoadedResponse | EmailPreferenceAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(failed(request.correlationId));
    }
    return Promise.resolve(
      new EmailPreferenceLoadedResponse(
        request.correlationId,
        this.state.preferences.get(request.profileId) ?? DEFAULT_EMAIL_PREFERENCE,
      ),
    );
  }
}

function failed(correlationId: string): EmailPreferenceAccessFailedResponse {
  return new EmailPreferenceAccessFailedResponse(
    correlationId,
    "EMAIL_PREFERENCE_FAKE_RESULT=fail",
  );
}
