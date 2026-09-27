import type { IFollowAccessor } from "../../../Accessors/FollowAccessor/IFollowAccessor";
import { RemoveFollowRequest } from "../../../Accessors/FollowAccessor/Requests/RemoveFollowRequest";
import { FollowRemovedResponse } from "../../../Accessors/FollowAccessor/Responses/FollowRemovedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { ownProfileSubject } from "../ownProfileSubject";
import { permit } from "../permit";
import type { UnfollowRequest } from "../Requests/UnfollowRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { FollowSetResponse } from "../Responses/FollowSetResponse";
import { unavailable } from "../unavailable";

type Result = FollowSetResponse | ActionForbiddenResponse | AccountUnavailableResponse;

export class UnfollowHandler implements IHandler<UnfollowRequest, Result> {
  constructor(
    private readonly follows: IFollowAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: UnfollowRequest): Promise<Result> {
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
    const removed = await this.follows.remove(
      new RemoveFollowRequest(actor.profile.id, target, context),
    );
    if (!(removed instanceof FollowRemovedResponse)) {
      return unavailable(correlationId, removed, "follows.remove");
    }
    return new FollowSetResponse(correlationId, false);
  }
}
