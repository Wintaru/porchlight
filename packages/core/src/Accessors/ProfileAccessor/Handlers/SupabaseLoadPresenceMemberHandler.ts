import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadPresenceMemberRequest } from "../Requests/LoadPresenceMemberRequest";
import { PresenceMemberLoadedResponse } from "../Responses/PresenceMemberLoadedResponse";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileNotFoundResponse } from "../Responses/ProfileNotFoundResponse";
import { PROFILE_COLUMNS, toProfile } from "../toProfile";

export class SupabaseLoadPresenceMemberHandler implements IHandler<
  LoadPresenceMemberRequest,
  PresenceMemberLoadedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadPresenceMemberRequest,
  ): Promise<
    PresenceMemberLoadedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
  > {
    const { data, error } = await this.db
      .from("profiles")
      .select(`${PROFILE_COLUMNS}, show_presence`)
      .eq("id", request.profileId)
      .maybeSingle();
    if (error) {
      return new ProfileAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new ProfileNotFoundResponse(request.correlationId);
    }
    return new PresenceMemberLoadedResponse(
      request.correlationId,
      toProfile(data),
      data.show_presence,
    );
  }
}
