import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreSubscriptionConfirmationRequest } from "../Requests/StoreSubscriptionConfirmationRequest";
import { SubscriberAccessFailedResponse } from "../Responses/SubscriberAccessFailedResponse";
import { SubscriptionConfirmationStoredResponse } from "../Responses/SubscriptionConfirmationStoredResponse";

export class SupabaseStoreSubscriptionConfirmationHandler implements IHandler<
  StoreSubscriptionConfirmationRequest,
  SubscriptionConfirmationStoredResponse | SubscriberAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreSubscriptionConfirmationRequest,
  ): Promise<SubscriptionConfirmationStoredResponse | SubscriberAccessFailedResponse> {
    const { data, error } = await this.db.rpc("confirm_subscription", {
      p_token: request.token,
    });
    if (error) {
      return new SubscriberAccessFailedResponse(request.correlationId, error.message);
    }
    return new SubscriptionConfirmationStoredResponse(request.correlationId, data);
  }
}
