import type { IFollowAccessor } from "../../../Accessors/FollowAccessor/IFollowAccessor";
import { StoreFollowRequest } from "../../../Accessors/FollowAccessor/Requests/StoreFollowRequest";
import { FollowStoredResponse } from "../../../Accessors/FollowAccessor/Responses/FollowStoredResponse";
import { FollowTargetMissingResponse } from "../../../Accessors/FollowAccessor/Responses/FollowTargetMissingResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadProfileByIdRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadProfileByIdRequest";
import { ProfileLoadedResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileLoadedResponse";
import { ProfileNotFoundResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileNotFoundResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { ownProfileSubject } from "../ownProfileSubject";
import { permit } from "../permit";
import type { FollowRequest } from "../Requests/FollowRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { FollowRejectedResponse } from "../Responses/FollowRejectedResponse";
import { FollowSetResponse } from "../Responses/FollowSetResponse";
import { unavailable } from "../unavailable";

type Result =
  | FollowSetResponse
  | FollowRejectedResponse
  | ActionForbiddenResponse
  | AccountUnavailableResponse;

// Permission, then the target, then the write (#24). An author must be an active member
// who is not the actor; a tag must exist, which the store's foreign key answers.
export class FollowHandler implements IHandler<FollowRequest, Result> {
  constructor(
    private readonly follows: IFollowAccessor,
    private readonly profiles: IProfileAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: FollowRequest): Promise<Result> {
    const { correlationId, actor, target, timestamp } = request;
    const context = { correlationId, timestamp };

    const refused = await permit(
      this.permissions,
      actor,
      "member.follow",
      ownProfileSubject(actor),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    if (actor.kind === "visitor") {
      return new AccountUnavailableResponse(
        correlationId,
        "member.follow granted to a visitor",
      );
    }
    if (target.kind === "author") {
      if (target.profileId === actor.profile.id) {
        return new FollowRejectedResponse(correlationId, "self");
      }
      const author = await this.profiles.load(
        new LoadProfileByIdRequest(target.profileId, context),
      );
      if (author instanceof ProfileNotFoundResponse) {
        return new FollowRejectedResponse(correlationId, "no-such-target");
      }
      if (!(author instanceof ProfileLoadedResponse)) {
        return unavailable(correlationId, author, "profiles.load");
      }
      // Suspended, banned and erased authors all answer like a missing one (#85). Their
      // profile is a 404, so the only way here is a hand-made request. Follows made
      // while the author was active stay (decision C3).
      if (author.profile.status !== "active") {
        return new FollowRejectedResponse(correlationId, "no-such-target");
      }
    }
    const stored = await this.follows.store(
      new StoreFollowRequest(actor.profile.id, target, context),
    );
    if (stored instanceof FollowTargetMissingResponse) {
      return new FollowRejectedResponse(correlationId, "no-such-target");
    }
    if (!(stored instanceof FollowStoredResponse)) {
      return unavailable(correlationId, stored, "follows.store");
    }
    return new FollowSetResponse(correlationId, true);
  }
}
