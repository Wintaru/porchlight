import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { CountProfilesRequest } from "../Requests/CountProfilesRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileCountResponse } from "../Responses/ProfileCountResponse";

// `head: true` asks PostgREST for the count only, no rows.
export class SupabaseCountProfilesHandler implements IHandler<
  CountProfilesRequest,
  ProfileCountResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: CountProfilesRequest,
  ): Promise<ProfileCountResponse | ProfileAccessFailedResponse> {
    const { count, error } = await this.db
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if (error) {
      return new ProfileAccessFailedResponse(request.correlationId, error.message);
    }
    if (count === null) {
      return new ProfileAccessFailedResponse(
        request.correlationId,
        "count came back null",
      );
    }
    return new ProfileCountResponse(request.correlationId, count);
  }
}
