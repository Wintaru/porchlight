import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ClaimAnonymousAuthorRequest } from "../Requests/ClaimAnonymousAuthorRequest";
import { AnonymousAuthorAccessFailedResponse } from "../Responses/AnonymousAuthorAccessFailedResponse";
import { AnonymousAuthorAlreadyClaimedResponse } from "../Responses/AnonymousAuthorAlreadyClaimedResponse";
import { AnonymousAuthorClaimedResponse } from "../Responses/AnonymousAuthorClaimedResponse";
import { AnonymousAuthorNotFoundResponse } from "../Responses/AnonymousAuthorNotFoundResponse";

// `claim_anonymous_author` moves every table in one transaction (posts, comments,
// media) and reports which of the three outcomes happened, so this handler never reads
// the row back to find out.
export class SupabaseClaimAnonymousAuthorHandler implements IHandler<
  ClaimAnonymousAuthorRequest,
  | AnonymousAuthorClaimedResponse
  | AnonymousAuthorAlreadyClaimedResponse
  | AnonymousAuthorNotFoundResponse
  | AnonymousAuthorAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: ClaimAnonymousAuthorRequest,
  ): Promise<
    | AnonymousAuthorClaimedResponse
    | AnonymousAuthorAlreadyClaimedResponse
    | AnonymousAuthorNotFoundResponse
    | AnonymousAuthorAccessFailedResponse
  > {
    const { data, error } = await this.db.rpc("claim_anonymous_author", {
      p_anonymous_author_id: request.anonymousAuthorId,
      p_profile_id: request.profileId,
    });
    if (error) {
      return new AnonymousAuthorAccessFailedResponse(
        request.correlationId,
        error.message,
      );
    }
    if (data === "claimed") {
      return new AnonymousAuthorClaimedResponse(request.correlationId);
    }
    if (data === "already-claimed") {
      return new AnonymousAuthorAlreadyClaimedResponse(request.correlationId);
    }
    if (data === "no-such-author") {
      return new AnonymousAuthorNotFoundResponse(request.correlationId);
    }
    return new AnonymousAuthorAccessFailedResponse(
      request.correlationId,
      `claim_anonymous_author returned ${JSON.stringify(data)}`,
    );
  }
}
