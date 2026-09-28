import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { RemoveOrphanAuthUserRequest } from "../Requests/RemoveOrphanAuthUserRequest";
import { OrphanAuthUserRemovedResponse } from "../Responses/OrphanAuthUserRemovedResponse";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileLoadedResponse } from "../Responses/ProfileLoadedResponse";
import { PROFILE_COLUMNS, toProfile } from "../toProfile";

type Result =
  OrphanAuthUserRemovedResponse | ProfileLoadedResponse | ProfileAccessFailedResponse;

const HTTP_NOT_FOUND = 404;

// The profile is read right before the delete, so a request that made the profile a
// moment ago (the same person in another tab) keeps its account: the answer is then that
// profile. GoTrue's admin API is not reachable from SQL, so the read and the delete
// cannot share a transaction. A profile stored in the gap between them would outlive
// its auth user (profiles has no foreign key to auth.users). The Manager asks for a
// removal only where no other request can be storing a profile for this person, so the
// gap stays narrow: the same person signing in at the same moment in two browsers.
export class SupabaseRemoveOrphanAuthUserHandler implements IHandler<
  RemoveOrphanAuthUserRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: RemoveOrphanAuthUserRequest): Promise<Result> {
    const { id, correlationId } = request;
    const { data, error } = await this.db
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) {
      return new ProfileAccessFailedResponse(correlationId, error.message);
    }
    if (data !== null) {
      return new ProfileLoadedResponse(correlationId, toProfile(data));
    }
    const { error: authError } = await this.db.auth.admin.deleteUser(id);
    // Gone already (a reloaded callback, a double submit): nothing is left to remove.
    if (authError && authError.status !== HTTP_NOT_FOUND) {
      return new ProfileAccessFailedResponse(correlationId, authError.message);
    }
    return new OrphanAuthUserRemovedResponse(correlationId);
  }
}
