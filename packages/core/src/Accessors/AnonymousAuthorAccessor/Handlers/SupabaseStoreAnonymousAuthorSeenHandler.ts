import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreAnonymousAuthorSeenRequest } from "../Requests/StoreAnonymousAuthorSeenRequest";
import { AnonymousAuthorAccessFailedResponse } from "../Responses/AnonymousAuthorAccessFailedResponse";
import { AnonymousAuthorSeenResponse } from "../Responses/AnonymousAuthorSeenResponse";

export class SupabaseStoreAnonymousAuthorSeenHandler implements IHandler<
  StoreAnonymousAuthorSeenRequest,
  AnonymousAuthorSeenResponse | AnonymousAuthorAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreAnonymousAuthorSeenRequest,
  ): Promise<AnonymousAuthorSeenResponse | AnonymousAuthorAccessFailedResponse> {
    const { anonymousAuthorId, ipHash, timestamp, correlationId } = request;
    const { error } = await this.db
      .from("anonymous_authors")
      .update({ ip_hash: ipHash, last_seen_at: timestamp.toISOString() })
      .eq("id", anonymousAuthorId);
    if (error) {
      return new AnonymousAuthorAccessFailedResponse(correlationId, error.message);
    }
    return new AnonymousAuthorSeenResponse(correlationId);
  }
}
