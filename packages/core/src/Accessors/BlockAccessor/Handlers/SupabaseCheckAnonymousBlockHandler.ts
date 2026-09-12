import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { CheckAnonymousBlockRequest } from "../Requests/CheckAnonymousBlockRequest";
import { AnonymousBlockedResponse } from "../Responses/AnonymousBlockedResponse";
import { AnonymousNotBlockedResponse } from "../Responses/AnonymousNotBlockedResponse";
import { BlockAccessFailedResponse } from "../Responses/BlockAccessFailedResponse";

// One query, filtered at the source on whichever subjects the submission has (D15): a
// first write has no author id yet, so only the IP hash is checked; a returning
// visitor is checked on both. An expired block (`expires_at` in the past) does not
// match.
export class SupabaseCheckAnonymousBlockHandler implements IHandler<
  CheckAnonymousBlockRequest,
  AnonymousBlockedResponse | AnonymousNotBlockedResponse | BlockAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: CheckAnonymousBlockRequest,
  ): Promise<
    AnonymousBlockedResponse | AnonymousNotBlockedResponse | BlockAccessFailedResponse
  > {
    const subjects =
      request.anonymousAuthorId === undefined
        ? `ip_hash.eq.${request.ipHash}`
        : `anonymous_author_id.eq.${request.anonymousAuthorId},ip_hash.eq.${request.ipHash}`;
    // PostgREST filter values are literals, not SQL expressions: "now()" would be
    // compared as the four-character string, so the instant is computed here.
    const notExpired = `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`;
    // Neither column is unique (a moderator can block the same visitor by token and
    // by IP separately), so more than one row can match: `.limit(1)` over `maybeSingle`,
    // ordered so a permanent block (`expires_at is null`) wins over a temporary one.
    const { data, error } = await this.db
      .from("blocks")
      .select("reason, expires_at")
      .or(subjects)
      .or(notExpired)
      .order("expires_at", { ascending: true, nullsFirst: true })
      .limit(1);
    if (error) {
      return new BlockAccessFailedResponse(request.correlationId, error.message);
    }
    const block = data[0];
    return block === undefined
      ? new AnonymousNotBlockedResponse(request.correlationId)
      : new AnonymousBlockedResponse(request.correlationId, block.reason);
  }
}
