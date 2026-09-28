import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ReleaseSubscriberEmailsRequest } from "../Requests/ReleaseSubscriberEmailsRequest";
import { SubscriberAccessFailedResponse } from "../Responses/SubscriberAccessFailedResponse";
import { SubscriberEmailsReleasedResponse } from "../Responses/SubscriberEmailsReleasedResponse";

export class SupabaseReleaseSubscriberEmailsHandler implements IHandler<
  ReleaseSubscriberEmailsRequest,
  SubscriberEmailsReleasedResponse | SubscriberAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: ReleaseSubscriberEmailsRequest,
  ): Promise<SubscriberEmailsReleasedResponse | SubscriberAccessFailedResponse> {
    const { claims, correlationId } = request;
    if (claims.length === 0) {
      return new SubscriberEmailsReleasedResponse(correlationId);
    }
    const { error } = await this.db.rpc("release_subscriber_emails", {
      p_claims: claims.map((claim) => ({
        subscriber_id: claim.subscriberId,
        window_start: claim.windowStart.toISOString(),
        window_end: claim.windowEnd.toISOString(),
      })),
    });
    if (error) {
      return new SubscriberAccessFailedResponse(correlationId, error.message);
    }
    return new SubscriberEmailsReleasedResponse(correlationId);
  }
}
