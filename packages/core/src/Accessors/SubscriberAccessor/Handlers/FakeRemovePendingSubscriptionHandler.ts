import type { IHandler } from "../../../Common/IHandler";
import type { FakeSubscriberState } from "../FakeSubscriberState";
import type { RemovePendingSubscriptionRequest } from "../Requests/RemovePendingSubscriptionRequest";
import { SubscriberAccessFailedResponse } from "../Responses/SubscriberAccessFailedResponse";
import { SubscriberRemovedResponse } from "../Responses/SubscriberRemovedResponse";

export class FakeRemovePendingSubscriptionHandler implements IHandler<
  RemovePendingSubscriptionRequest,
  SubscriberRemovedResponse | SubscriberAccessFailedResponse
> {
  constructor(private readonly state: FakeSubscriberState) {}

  handle(
    request: RemovePendingSubscriptionRequest,
  ): Promise<SubscriberRemovedResponse | SubscriberAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new SubscriberAccessFailedResponse(
          request.correlationId,
          "SUBSCRIBER_FAKE_RESULT=fail",
        ),
      );
    }
    for (const [key, subscriber] of this.state.subscribers) {
      if (!subscriber.confirmed && subscriber.confirmToken === request.confirmToken) {
        this.state.subscribers.delete(key);
        return Promise.resolve(
          new SubscriberRemovedResponse(request.correlationId, true),
        );
      }
    }
    return Promise.resolve(new SubscriberRemovedResponse(request.correlationId, false));
  }
}
