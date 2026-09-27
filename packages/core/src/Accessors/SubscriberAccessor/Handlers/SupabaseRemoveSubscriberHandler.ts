import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { RemoveSubscriberRequest } from "../Requests/RemoveSubscriberRequest";
import { SubscriberAccessFailedResponse } from "../Responses/SubscriberAccessFailedResponse";
import { SubscriberRemovedResponse } from "../Responses/SubscriberRemovedResponse";

// The row goes: an address that unsubscribed keeps nothing here.
export class SupabaseRemoveSubscriberHandler implements IHandler<
  RemoveSubscriberRequest,
  SubscriberRemovedResponse | SubscriberAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: RemoveSubscriberRequest,
  ): Promise<SubscriberRemovedResponse | SubscriberAccessFailedResponse> {
    const { data, error } = await this.db
      .from("subscribers")
      .delete()
      .eq("unsubscribe_token", request.token)
      .select("id");
    if (error) {
      return new SubscriberAccessFailedResponse(request.correlationId, error.message);
    }
    return new SubscriberRemovedResponse(request.correlationId, data.length > 0);
  }
}
