import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadPresenceSettingRequest } from "../Requests/LoadPresenceSettingRequest";
import { PresenceSettingLoadedResponse } from "../Responses/PresenceSettingLoadedResponse";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileNotFoundResponse } from "../Responses/ProfileNotFoundResponse";

export class SupabaseLoadPresenceSettingHandler implements IHandler<
  LoadPresenceSettingRequest,
  PresenceSettingLoadedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadPresenceSettingRequest,
  ): Promise<
    PresenceSettingLoadedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
  > {
    const { data, error } = await this.db
      .from("profiles")
      .select("show_presence")
      .eq("id", request.profileId)
      .maybeSingle();
    if (error) {
      return new ProfileAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new ProfileNotFoundResponse(request.correlationId);
    }
    return new PresenceSettingLoadedResponse(request.correlationId, data.show_presence);
  }
}
