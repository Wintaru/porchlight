import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StorePresenceSettingRequest } from "../Requests/StorePresenceSettingRequest";
import { PresenceSettingStoredResponse } from "../Responses/PresenceSettingStoredResponse";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileNotFoundResponse } from "../Responses/ProfileNotFoundResponse";

export class SupabaseStorePresenceSettingHandler implements IHandler<
  StorePresenceSettingRequest,
  PresenceSettingStoredResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StorePresenceSettingRequest,
  ): Promise<
    PresenceSettingStoredResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
  > {
    const { data, error } = await this.db
      .from("profiles")
      .update({ show_presence: request.visible })
      .eq("id", request.profileId)
      .select("id")
      .maybeSingle();
    if (error) {
      return new ProfileAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new ProfileNotFoundResponse(request.correlationId);
    }
    return new PresenceSettingStoredResponse(request.correlationId);
  }
}
