import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { StoreProfileChangesRequest } from "../../../Accessors/ProfileAccessor/Requests/StoreProfileChangesRequest";
import { ProfileAccessFailedResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileAccessFailedResponse";
import { ProfileHandleTakenResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileHandleTakenResponse";
import { ProfileNotFoundResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileNotFoundResponse";
import { ProfileStoredResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { EvaluatePermissionRequest } from "../../../Engines/PermissionEngine/Requests/EvaluatePermissionRequest";
import { ValidateHandleRequest } from "../../../Engines/PermissionEngine/Requests/ValidateHandleRequest";
import { HandleInvalidResponse } from "../../../Engines/PermissionEngine/Responses/HandleInvalidResponse";
import { HandleValidResponse } from "../../../Engines/PermissionEngine/Responses/HandleValidResponse";
import { PermissionDeniedResponse } from "../../../Engines/PermissionEngine/Responses/PermissionDeniedResponse";
import { PermissionGrantedResponse } from "../../../Engines/PermissionEngine/Responses/PermissionGrantedResponse";
import type { UpdateProfileRequest } from "../Requests/UpdateProfileRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { HandleRejectedResponse } from "../Responses/HandleRejectedResponse";
import { NoSuchProfileResponse } from "../Responses/NoSuchProfileResponse";
import { ProfileResponse } from "../Responses/ProfileResponse";

type UpdateProfileResult =
  | ProfileResponse
  | NoSuchProfileResponse
  | ActionForbiddenResponse
  | HandleRejectedResponse
  | AccountUnavailableResponse;

// Permission, then the handle rules, then the write. The store's unique constraint is
// the last word on the handle, so a race between two members picking the same one ends
// as `taken` for the second, not as a duplicate.
export class UpdateProfileHandler implements IHandler<
  UpdateProfileRequest,
  UpdateProfileResult
> {
  constructor(
    private readonly profiles: IProfileAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: UpdateProfileRequest): Promise<UpdateProfileResult> {
    const { correlationId, actor, profileId, changes } = request;
    const context = { correlationId };

    const verdict = await this.permissions.evaluate(
      new EvaluatePermissionRequest(
        actor,
        "profile.edit",
        { kind: "profile", id: profileId },
        context,
      ),
    );
    if (verdict instanceof PermissionDeniedResponse) {
      return new ActionForbiddenResponse(correlationId, verdict.reason);
    }
    if (!(verdict instanceof PermissionGrantedResponse)) {
      return new AccountUnavailableResponse(
        correlationId,
        `unexpected ${verdict.constructor.name} from evaluate`,
      );
    }

    if (changes.handle !== undefined) {
      const validated = await this.permissions.evaluate(
        new ValidateHandleRequest(changes.handle, context),
      );
      if (validated instanceof HandleInvalidResponse) {
        return new HandleRejectedResponse(
          correlationId,
          changes.handle,
          validated.reason,
        );
      }
      if (!(validated instanceof HandleValidResponse)) {
        return new AccountUnavailableResponse(
          correlationId,
          `unexpected ${validated.constructor.name} from evaluate`,
        );
      }
    }

    const stored = await this.profiles.store(
      new StoreProfileChangesRequest(profileId, changes, context),
    );
    if (stored instanceof ProfileStoredResponse) {
      return new ProfileResponse(correlationId, stored.profile);
    }
    if (stored instanceof ProfileNotFoundResponse) {
      return new NoSuchProfileResponse(correlationId);
    }
    if (stored instanceof ProfileHandleTakenResponse) {
      return new HandleRejectedResponse(correlationId, stored.handle, "taken");
    }
    const reason =
      stored instanceof ProfileAccessFailedResponse
        ? stored.reason
        : `unexpected ${stored.constructor.name} from store`;
    return new AccountUnavailableResponse(correlationId, reason);
  }
}
