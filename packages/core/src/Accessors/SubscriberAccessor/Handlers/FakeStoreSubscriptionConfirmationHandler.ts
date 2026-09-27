import type { IHandler } from "../../../Common/IHandler";
import type { FakeSubscriberState } from "../FakeSubscriberState";
import type { StoreSubscriptionConfirmationRequest } from "../Requests/StoreSubscriptionConfirmationRequest";
import { SubscriberAccessFailedResponse } from "../Responses/SubscriberAccessFailedResponse";
import { SubscriptionConfirmationStoredResponse } from "../Responses/SubscriptionConfirmationStoredResponse";

export class FakeStoreSubscriptionConfirmationHandler implements IHandler<
  StoreSubscriptionConfirmationRequest,
  SubscriptionConfirmationStoredResponse | SubscriberAccessFailedResponse
> {
  constructor(private readonly state: FakeSubscriberState) {}

  handle(
    request: StoreSubscriptionConfirmationRequest,
  ): Promise<SubscriptionConfirmationStoredResponse | SubscriberAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new SubscriberAccessFailedResponse(
          request.correlationId,
          "SUBSCRIBER_FAKE_RESULT=fail",
        ),
      );
    }
    for (const [key, subscriber] of this.state.subscribers) {
      if (!subscriber.confirmed && subscriber.confirmToken === request.token) {
        this.state.subscribers.set(key, {
          ...subscriber,
          confirmed: true,
          confirmToken: null,
        });
        return Promise.resolve(
          new SubscriptionConfirmationStoredResponse(request.correlationId, true),
        );
      }
    }
    return Promise.resolve(
      new SubscriptionConfirmationStoredResponse(request.correlationId, false),
    );
  }
}
