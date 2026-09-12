import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { BumpRateLimitRequest } from "../Requests/BumpRateLimitRequest";
import { RateLimitAccessFailedResponse } from "../Responses/RateLimitAccessFailedResponse";
import { RateLimitBumpedResponse } from "../Responses/RateLimitBumpedResponse";

// bump_rate_limit upserts and returns the new count in one round trip, so two
// submissions in the same window never race between a read and a write.
export class SupabaseBumpRateLimitHandler implements IHandler<
  BumpRateLimitRequest,
  RateLimitBumpedResponse | RateLimitAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: BumpRateLimitRequest,
  ): Promise<RateLimitBumpedResponse | RateLimitAccessFailedResponse> {
    const { data, error } = await this.db.rpc("bump_rate_limit", {
      p_subject: request.subject,
      p_action: request.action,
      p_window_start: request.windowStart.toISOString(),
    });
    if (error) {
      return new RateLimitAccessFailedResponse(request.correlationId, error.message);
    }
    return new RateLimitBumpedResponse(request.correlationId, data);
  }
}
