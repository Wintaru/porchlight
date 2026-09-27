import type { IEmailPreferenceAccessor } from "../../../Accessors/EmailPreferenceAccessor/IEmailPreferenceAccessor";
import { StoreMemberUnsubscribeRequest } from "../../../Accessors/EmailPreferenceAccessor/Requests/StoreMemberUnsubscribeRequest";
import { MemberUnsubscribedResponse } from "../../../Accessors/EmailPreferenceAccessor/Responses/MemberUnsubscribedResponse";
import type { ISubscriberAccessor } from "../../../Accessors/SubscriberAccessor/ISubscriberAccessor";
import { RemoveSubscriberRequest } from "../../../Accessors/SubscriberAccessor/Requests/RemoveSubscriberRequest";
import { SubscriberRemovedResponse } from "../../../Accessors/SubscriberAccessor/Responses/SubscriberRemovedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { UnsubscribeRequest } from "../Requests/UnsubscribeRequest";
import type { NotificationUnavailableResponse } from "../Responses/NotificationUnavailableResponse";
import { UnsubscribedResponse } from "../Responses/UnsubscribedResponse";
import { unavailable } from "../unavailable";

type Result = UnsubscribedResponse | NotificationUnavailableResponse;

// An unsubscribe link turns every email off for whoever it was sent to: a member's
// digests and queue email, or a reader's subscription. The token is one or the other.
// It works signed out and asks nothing else: the token is the proof (RFC 8058).
export class UnsubscribeHandler implements IHandler<UnsubscribeRequest, Result> {
  constructor(
    private readonly preferences: IEmailPreferenceAccessor,
    private readonly subscribers: ISubscriberAccessor,
  ) {}

  async handle(request: UnsubscribeRequest): Promise<Result> {
    const { correlationId, token, timestamp } = request;
    if (token === "") {
      return new UnsubscribedResponse(correlationId, false);
    }
    const context = { correlationId, timestamp };
    const member = await this.preferences.store(
      new StoreMemberUnsubscribeRequest(token, context),
    );
    if (!(member instanceof MemberUnsubscribedResponse)) {
      return unavailable(correlationId, member, "preferences.store");
    }
    if (member.found) {
      return new UnsubscribedResponse(correlationId, true);
    }
    const reader = await this.subscribers.remove(
      new RemoveSubscriberRequest(token, context),
    );
    if (!(reader instanceof SubscriberRemovedResponse)) {
      return unavailable(correlationId, reader, "subscribers.remove");
    }
    return new UnsubscribedResponse(correlationId, reader.found);
  }
}
