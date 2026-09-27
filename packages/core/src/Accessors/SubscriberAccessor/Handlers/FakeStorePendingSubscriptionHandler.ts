import type { IHandler } from "../../../Common/IHandler";
import { FakeSubscriberState } from "../FakeSubscriberState";
import type { StorePendingSubscriptionRequest } from "../Requests/StorePendingSubscriptionRequest";
import { SubscriberAccessFailedResponse } from "../Responses/SubscriberAccessFailedResponse";
import { SubscriptionAskedResponse } from "../Responses/SubscriptionAskedResponse";

// The real function's rules minus the ten-minute hold, which needs a clock the fake
// does not keep.
export class FakeStorePendingSubscriptionHandler implements IHandler<
  StorePendingSubscriptionRequest,
  SubscriptionAskedResponse | SubscriberAccessFailedResponse
> {
  constructor(private readonly state: FakeSubscriberState) {}

  handle(
    request: StorePendingSubscriptionRequest,
  ): Promise<SubscriptionAskedResponse | SubscriberAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new SubscriberAccessFailedResponse(
          request.correlationId,
          "SUBSCRIBER_FAKE_RESULT=fail",
        ),
      );
    }
    const { email, authorId, digest, confirmToken, correlationId } = request;
    const key = FakeSubscriberState.keyOf(email, authorId);
    const existing = this.state.subscribers.get(key);
    if (existing?.confirmed === true) {
      return Promise.resolve(new SubscriptionAskedResponse(correlationId, "confirmed"));
    }
    this.state.subscribers.set(key, {
      email,
      authorId,
      digest,
      confirmToken,
      confirmed: false,
      unsubscribeToken: existing?.unsubscribeToken ?? `unsub-${key}`,
    });
    return Promise.resolve(new SubscriptionAskedResponse(correlationId, "pending"));
  }
}
