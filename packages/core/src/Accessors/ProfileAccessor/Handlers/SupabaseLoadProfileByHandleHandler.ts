import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadProfileByHandleRequest } from "../Requests/LoadProfileByHandleRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileLoadedResponse } from "../Responses/ProfileLoadedResponse";
import { ProfileNotFoundResponse } from "../Responses/ProfileNotFoundResponse";
import { PROFILE_COLUMNS, toProfile } from "../toProfile";

export class SupabaseLoadProfileByHandleHandler implements IHandler<
  LoadProfileByHandleRequest,
  ProfileLoadedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadProfileByHandleRequest,
  ): Promise<
    ProfileLoadedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
  > {
    const { data, error } = await this.db
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("handle", request.handle)
      .maybeSingle();
    if (error) {
      return new ProfileAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new ProfileNotFoundResponse(request.correlationId);
    }
    return new ProfileLoadedResponse(request.correlationId, toProfile(data));
  }
}
