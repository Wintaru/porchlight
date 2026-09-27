import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ReleaseSubscriberEmailRequest } from "../Requests/ReleaseSubscriberEmailRequest";
import { SubscriberAccessFailedResponse } from "../Responses/SubscriberAccessFailedResponse";
import { SubscriberEmailReleasedResponse } from "../Responses/SubscriberEmailReleasedResponse";

export class SupabaseReleaseSubscriberEmailHandler implements IHandler<
  ReleaseSubscriberEmailRequest,
  SubscriberEmailReleasedResponse | SubscriberAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: ReleaseSubscriberEmailRequest,
  ): Promise<SubscriberEmailReleasedResponse | SubscriberAccessFailedResponse> {
    const { claim, correlationId } = request;
    const { error } = await this.db.rpc("release_subscriber_email", {
      p_subscriber_id: claim.subscriberId,
      p_window_start: claim.windowStart.toISOString(),
      p_window_end: claim.windowEnd.toISOString(),
    });
    if (error) {
      return new SubscriberAccessFailedResponse(correlationId, error.message);
    }
    return new SubscriberEmailReleasedResponse(correlationId);
  }
}
