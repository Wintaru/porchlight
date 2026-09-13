import type { IProfileAccessor } from "../../Accessors/ProfileAccessor/IProfileAccessor";
import type { ProfileChanges } from "../../Accessors/ProfileAccessor/ProfileChanges";
import { LoadProfileByIdRequest } from "../../Accessors/ProfileAccessor/Requests/LoadProfileByIdRequest";
import { StoreProfileChangesRequest } from "../../Accessors/ProfileAccessor/Requests/StoreProfileChangesRequest";
import { ProfileLoadedResponse } from "../../Accessors/ProfileAccessor/Responses/ProfileLoadedResponse";
import { ProfileNotFoundResponse } from "../../Accessors/ProfileAccessor/Responses/ProfileNotFoundResponse";
import { ProfileStoredResponse } from "../../Accessors/ProfileAccessor/Responses/ProfileStoredResponse";
import type { Actor } from "../../Common/Actor";
import type { Profile } from "../../Common/Profile";
import type { PermissionAction } from "../../Engines/PermissionEngine/PermissionAction";
import type { IPermissionEngine } from "../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "./permit";
import type { ModerationForbiddenResponse } from "./Responses/ModerationForbiddenResponse";
import type { ModerationUnavailableResponse } from "./Responses/ModerationUnavailableResponse";
import { NoSuchProfileResponse } from "./Responses/NoSuchProfileResponse";
import { unavailable } from "./unavailable";

// The shared move behind suspend, ban and promote (SPEC.md §4, §7): load the target
// profile, gate the action, write the one field each of them changes.
export async function moderateProfile(
  profiles: IProfileAccessor,
  permissions: IPermissionEngine,
  actor: Actor,
  profileId: string,
  action: PermissionAction,
  changes: ProfileChanges,
  context: { readonly correlationId: string },
): Promise<
  | Profile
  | NoSuchProfileResponse
  | ModerationForbiddenResponse
  | ModerationUnavailableResponse
> {
  const loaded = await profiles.load(new LoadProfileByIdRequest(profileId, context));
  if (loaded instanceof ProfileNotFoundResponse) {
    return new NoSuchProfileResponse(context.correlationId);
  }
  if (!(loaded instanceof ProfileLoadedResponse)) {
    return unavailable(context.correlationId, loaded, "profiles.load");
  }

  const refused = await permit(
    permissions,
    actor,
    action,
    { kind: "profile", id: loaded.profile.id },
    context,
  );
  if (refused !== undefined) {
    return refused;
  }

  const stored = await profiles.store(
    new StoreProfileChangesRequest(profileId, changes, context),
  );
  if (stored instanceof ProfileNotFoundResponse) {
    return new NoSuchProfileResponse(context.correlationId);
  }
  if (!(stored instanceof ProfileStoredResponse)) {
    return unavailable(context.correlationId, stored, "profiles.store");
  }
  return stored.profile;
}
