import type { IEmailPreferenceAccessor } from "../../../Accessors/EmailPreferenceAccessor/IEmailPreferenceAccessor";
import { StoreMemberUnsubscribeRequest } from "../../../Accessors/EmailPreferenceAccessor/Requests/StoreMemberUnsubscribeRequest";
import { MemberUnsubscribedResponse } from "../../../Accessors/EmailPreferenceAccessor/Responses/MemberUnsubscribedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { UnsubscribeRequest } from "../Requests/UnsubscribeRequest";
import type { NotificationUnavailableResponse } from "../Responses/NotificationUnavailableResponse";
import { UnsubscribedResponse } from "../Responses/UnsubscribedResponse";
import { unavailable } from "../unavailable";

type Result = UnsubscribedResponse | NotificationUnavailableResponse;

// An unsubscribe link turns every email off for whoever it was sent to. It works signed
// out and asks nothing else: the token is the proof (RFC 8058).
export class UnsubscribeHandler implements IHandler<UnsubscribeRequest, Result> {
  constructor(private readonly preferences: IEmailPreferenceAccessor) {}

  async handle(request: UnsubscribeRequest): Promise<Result> {
    const { correlationId, token, timestamp } = request;
    if (token === "") {
      return new UnsubscribedResponse(correlationId, false);
    }
    const member = await this.preferences.store(
      new StoreMemberUnsubscribeRequest(token, { correlationId, timestamp }),
    );
    if (!(member instanceof MemberUnsubscribedResponse)) {
      return unavailable(correlationId, member, "preferences.store");
    }
    return new UnsubscribedResponse(correlationId, member.found);
  }
}
