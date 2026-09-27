import type { ISubscriberAccessor } from "../../../Accessors/SubscriberAccessor/ISubscriberAccessor";
import { StoreSubscriptionConfirmationRequest } from "../../../Accessors/SubscriberAccessor/Requests/StoreSubscriptionConfirmationRequest";
import { SubscriptionConfirmationStoredResponse } from "../../../Accessors/SubscriberAccessor/Responses/SubscriptionConfirmationStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { ConfirmSubscriptionRequest } from "../Requests/ConfirmSubscriptionRequest";
import type { NotificationUnavailableResponse } from "../Responses/NotificationUnavailableResponse";
import { SubscriptionConfirmedResponse } from "../Responses/SubscriptionConfirmedResponse";
import { unavailable } from "../unavailable";

type Result = SubscriptionConfirmedResponse | NotificationUnavailableResponse;

// The button on the confirm page (#22). The token is the proof that the address's owner
// asked; nothing else is needed.
export class ConfirmSubscriptionHandler implements IHandler<
  ConfirmSubscriptionRequest,
  Result
> {
  constructor(private readonly subscribers: ISubscriberAccessor) {}

  async handle(request: ConfirmSubscriptionRequest): Promise<Result> {
    const { correlationId, token, timestamp } = request;
    if (token === "") {
      return new SubscriptionConfirmedResponse(correlationId, false);
    }
    const stored = await this.subscribers.store(
      new StoreSubscriptionConfirmationRequest(token, { correlationId, timestamp }),
    );
    if (!(stored instanceof SubscriptionConfirmationStoredResponse)) {
      return unavailable(correlationId, stored, "subscribers.store");
    }
    return new SubscriptionConfirmedResponse(correlationId, stored.confirmed);
  }
}
