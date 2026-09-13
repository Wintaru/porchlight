import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ListStaffProfilesRequest } from "../Requests/ListStaffProfilesRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { StaffProfilesLoadedResponse } from "../Responses/StaffProfilesLoadedResponse";
import { PROFILE_COLUMNS, toProfile } from "../toProfile";

export class SupabaseListStaffProfilesHandler implements IHandler<
  ListStaffProfilesRequest,
  StaffProfilesLoadedResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: ListStaffProfilesRequest,
  ): Promise<StaffProfilesLoadedResponse | ProfileAccessFailedResponse> {
    const { data, error } = await this.db
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .in("role", ["admin", "moderator"])
      .eq("status", "active");
    if (error) {
      return new ProfileAccessFailedResponse(request.correlationId, error.message);
    }
    return new StaffProfilesLoadedResponse(request.correlationId, data.map(toProfile));
  }
}
