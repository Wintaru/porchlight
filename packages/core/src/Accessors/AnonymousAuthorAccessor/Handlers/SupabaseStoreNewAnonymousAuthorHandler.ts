import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreNewAnonymousAuthorRequest } from "../Requests/StoreNewAnonymousAuthorRequest";
import { AnonymousAuthorAccessFailedResponse } from "../Responses/AnonymousAuthorAccessFailedResponse";
import { AnonymousAuthorStoredResponse } from "../Responses/AnonymousAuthorStoredResponse";
import { toAnonymousAuthor } from "../toAnonymousAuthor";

const COLUMNS = "id, claimed_by, created_at";

// Insert only: two visitors never share a secret, so there is no "taken" case to
// answer (unlike a slug or a handle) and the unique constraint on secret_hash is a
// programmer error, not a response, if it ever trips.
export class SupabaseStoreNewAnonymousAuthorHandler implements IHandler<
  StoreNewAnonymousAuthorRequest,
  AnonymousAuthorStoredResponse | AnonymousAuthorAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreNewAnonymousAuthorRequest,
  ): Promise<AnonymousAuthorStoredResponse | AnonymousAuthorAccessFailedResponse> {
    const { data, error } = await this.db
      .from("anonymous_authors")
      .insert({ secret_hash: request.secretHash, ip_hash: request.ipHash })
      .select(COLUMNS)
      .single();
    if (error) {
      return new AnonymousAuthorAccessFailedResponse(
        request.correlationId,
        error.message,
      );
    }
    return new AnonymousAuthorStoredResponse(
      request.correlationId,
      toAnonymousAuthor(data),
    );
  }
}
