import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { isHandleTaken } from "../PostgresErrorCode";
import type { StoreNewProfileRequest } from "../Requests/StoreNewProfileRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileHandleTakenResponse } from "../Responses/ProfileHandleTakenResponse";
import { ProfileStoredResponse } from "../Responses/ProfileStoredResponse";
import { PROFILE_COLUMNS, toProfile } from "../toProfile";

export class SupabaseStoreNewProfileHandler implements IHandler<
  StoreNewProfileRequest,
  ProfileStoredResponse | ProfileHandleTakenResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreNewProfileRequest,
  ): Promise<
    ProfileStoredResponse | ProfileHandleTakenResponse | ProfileAccessFailedResponse
  > {
    const { profile } = request;
    const { data, error } = await this.db
      .from("profiles")
      .insert({
        id: profile.id,
        handle: profile.handle,
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl,
        role: profile.role,
        trust_level: profile.trustLevel,
      })
      .select(PROFILE_COLUMNS)
      .single();
    if (error) {
      return isHandleTaken(error)
        ? new ProfileHandleTakenResponse(request.correlationId, profile.handle)
        : new ProfileAccessFailedResponse(request.correlationId, error.message);
    }
    return new ProfileStoredResponse(request.correlationId, toProfile(data));
  }
}
