import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { RemovePendingSubscriptionRequest } from "../Requests/RemovePendingSubscriptionRequest";
import { SubscriberAccessFailedResponse } from "../Responses/SubscriberAccessFailedResponse";
import { SubscriberRemovedResponse } from "../Responses/SubscriberRemovedResponse";

export class SupabaseRemovePendingSubscriptionHandler implements IHandler<
  RemovePendingSubscriptionRequest,
  SubscriberRemovedResponse | SubscriberAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: RemovePendingSubscriptionRequest,
  ): Promise<SubscriberRemovedResponse | SubscriberAccessFailedResponse> {
    const { data, error } = await this.db.rpc("release_subscription_confirmation", {
      p_confirm_token: request.confirmToken,
    });
    if (error) {
      return new SubscriberAccessFailedResponse(request.correlationId, error.message);
    }
    return new SubscriberRemovedResponse(request.correlationId, data);
  }
}
