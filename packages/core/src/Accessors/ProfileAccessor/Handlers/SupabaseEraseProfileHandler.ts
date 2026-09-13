import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { EraseProfileRequest } from "../Requests/EraseProfileRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileErasedResponse } from "../Responses/ProfileErasedResponse";
import { ProfileNotFoundResponse } from "../Responses/ProfileNotFoundResponse";

type Result =
  ProfileErasedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse;

// `erase_account` moves every table it can in one transaction (posts, comments,
// reactions, non-retained media) and reports whether it ran. The auth user is deleted
// only once that has committed (D2's server-only write path; GoTrue's admin API is not
// reachable from inside the function, so this ordering is enforced here, not in SQL).
export class SupabaseEraseProfileHandler implements IHandler<
  EraseProfileRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: EraseProfileRequest): Promise<Result> {
    const { data, error } = await this.db.rpc("erase_account", {
      p_profile_id: request.id,
    });
    if (error) {
      return new ProfileAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === "not-found") {
      return new ProfileNotFoundResponse(request.correlationId);
    }
    if (data !== "erased" && data !== "already-erased") {
      return new ProfileAccessFailedResponse(
        request.correlationId,
        `erase_account returned ${JSON.stringify(data)}`,
      );
    }

    const { error: authError } = await this.db.auth.admin.deleteUser(request.id);
    // "already-erased" means a prior attempt got this far before failing on the auth
    // delete: the user may already be gone, so a not-found here is success, not a
    // failure to report.
    if (authError && authError.status !== 404) {
      return new ProfileAccessFailedResponse(request.correlationId, authError.message);
    }
    return new ProfileErasedResponse(request.correlationId);
  }
}
