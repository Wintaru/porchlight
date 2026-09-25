import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadAnonymousAuthorIpHashRequest } from "../Requests/LoadAnonymousAuthorIpHashRequest";
import { AnonymousAuthorAccessFailedResponse } from "../Responses/AnonymousAuthorAccessFailedResponse";
import { AnonymousAuthorIpHashLoadedResponse } from "../Responses/AnonymousAuthorIpHashLoadedResponse";
import { AnonymousAuthorNotFoundResponse } from "../Responses/AnonymousAuthorNotFoundResponse";

type Result =
  | AnonymousAuthorIpHashLoadedResponse
  | AnonymousAuthorNotFoundResponse
  | AnonymousAuthorAccessFailedResponse;

export class SupabaseLoadAnonymousAuthorIpHashHandler implements IHandler<
  LoadAnonymousAuthorIpHashRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: LoadAnonymousAuthorIpHashRequest): Promise<Result> {
    const { anonymousAuthorId, correlationId } = request;
    const { data, error } = await this.db
      .from("anonymous_authors")
      .select("ip_hash")
      .eq("id", anonymousAuthorId)
      .maybeSingle();
    if (error) {
      return new AnonymousAuthorAccessFailedResponse(correlationId, error.message);
    }
    if (data === null) {
      return new AnonymousAuthorNotFoundResponse(correlationId);
    }
    return new AnonymousAuthorIpHashLoadedResponse(correlationId, data.ip_hash);
  }
}
