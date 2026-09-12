import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadAnonymousAuthorBySecretHashRequest } from "../Requests/LoadAnonymousAuthorBySecretHashRequest";
import { AnonymousAuthorAccessFailedResponse } from "../Responses/AnonymousAuthorAccessFailedResponse";
import { AnonymousAuthorLoadedResponse } from "../Responses/AnonymousAuthorLoadedResponse";
import { AnonymousAuthorNotFoundResponse } from "../Responses/AnonymousAuthorNotFoundResponse";
import { toAnonymousAuthor } from "../toAnonymousAuthor";

const COLUMNS = "id, claimed_by, created_at";

export class SupabaseLoadAnonymousAuthorBySecretHashHandler implements IHandler<
  LoadAnonymousAuthorBySecretHashRequest,
  | AnonymousAuthorLoadedResponse
  | AnonymousAuthorNotFoundResponse
  | AnonymousAuthorAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadAnonymousAuthorBySecretHashRequest,
  ): Promise<
    | AnonymousAuthorLoadedResponse
    | AnonymousAuthorNotFoundResponse
    | AnonymousAuthorAccessFailedResponse
  > {
    const { data, error } = await this.db
      .from("anonymous_authors")
      .select(COLUMNS)
      .eq("secret_hash", request.secretHash)
      .maybeSingle();
    if (error) {
      return new AnonymousAuthorAccessFailedResponse(
        request.correlationId,
        error.message,
      );
    }
    if (data === null) {
      return new AnonymousAuthorNotFoundResponse(request.correlationId);
    }
    return new AnonymousAuthorLoadedResponse(
      request.correlationId,
      toAnonymousAuthor(data),
    );
  }
}
