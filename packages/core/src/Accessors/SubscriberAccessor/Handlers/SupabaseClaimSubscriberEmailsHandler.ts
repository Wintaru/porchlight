import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ClaimSubscriberEmailsRequest } from "../Requests/ClaimSubscriberEmailsRequest";
import { SubscriberAccessFailedResponse } from "../Responses/SubscriberAccessFailedResponse";
import { SubscriberEmailsClaimedResponse } from "../Responses/SubscriberEmailsClaimedResponse";

export class SupabaseClaimSubscriberEmailsHandler implements IHandler<
  ClaimSubscriberEmailsRequest,
  SubscriberEmailsClaimedResponse | SubscriberAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: ClaimSubscriberEmailsRequest,
  ): Promise<SubscriberEmailsClaimedResponse | SubscriberAccessFailedResponse> {
    const { until, limit, correlationId } = request;
    const { data, error } = await this.db.rpc("claim_subscriber_emails", {
      p_until: until.toISOString(),
      p_limit: limit,
    });
    if (error) {
      return new SubscriberAccessFailedResponse(correlationId, error.message);
    }
    return new SubscriberEmailsClaimedResponse(
      correlationId,
      data.map((row) => ({
        subscriberId: row.subscriber_id,
        email: row.email,
        authorId: row.author_id,
        unsubscribeToken: row.unsubscribe_token,
        windowStart: new Date(row.window_start),
        windowEnd: new Date(row.window_end),
      })),
    );
  }
}
