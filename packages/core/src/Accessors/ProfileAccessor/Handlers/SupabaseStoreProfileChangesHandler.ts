import type { DbClient, TablesUpdate } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { isHandleTaken } from "../PostgresErrorCode";
import type { ProfileChanges } from "../ProfileChanges";
import type { StoreProfileChangesRequest } from "../Requests/StoreProfileChangesRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileHandleTakenResponse } from "../Responses/ProfileHandleTakenResponse";
import { ProfileNotFoundResponse } from "../Responses/ProfileNotFoundResponse";
import { ProfileStoredResponse } from "../Responses/ProfileStoredResponse";
import { PROFILE_COLUMNS, toProfile } from "../toProfile";

export class SupabaseStoreProfileChangesHandler implements IHandler<
  StoreProfileChangesRequest,
  | ProfileStoredResponse
  | ProfileNotFoundResponse
  | ProfileHandleTakenResponse
  | ProfileAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreProfileChangesRequest,
  ): Promise<
    | ProfileStoredResponse
    | ProfileNotFoundResponse
    | ProfileHandleTakenResponse
    | ProfileAccessFailedResponse
  > {
    const { data, error } = await this.db
      .from("profiles")
      .update(toColumns(request.changes))
      .eq("id", request.id)
      .select(PROFILE_COLUMNS)
      .maybeSingle();
    if (error) {
      return isHandleTaken(error)
        ? new ProfileHandleTakenResponse(
            request.correlationId,
            request.changes.handle ?? "",
          )
        : new ProfileAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new ProfileNotFoundResponse(request.correlationId);
    }
    return new ProfileStoredResponse(request.correlationId, toProfile(data));
  }
}

// Only the fields present in the request reach the row, so an absent field is untouched.
function toColumns(changes: ProfileChanges): TablesUpdate<"profiles"> {
  const columns: TablesUpdate<"profiles"> = {};
  if (changes.handle !== undefined) columns.handle = changes.handle;
  if (changes.displayName !== undefined) columns.display_name = changes.displayName;
  if (changes.bio !== undefined) columns.bio = changes.bio;
  if (changes.avatarUrl !== undefined) columns.avatar_url = changes.avatarUrl;
  if (changes.trustLevel !== undefined) columns.trust_level = changes.trustLevel;
  if (changes.status !== undefined) columns.status = changes.status;
  return columns;
}
