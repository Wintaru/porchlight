import type { IMemberBlockAccessor } from "../../../Accessors/MemberBlockAccessor/IMemberBlockAccessor";
import { RemoveMemberBlockRequest } from "../../../Accessors/MemberBlockAccessor/Requests/RemoveMemberBlockRequest";
import { StoreMemberBlockRequest } from "../../../Accessors/MemberBlockAccessor/Requests/StoreMemberBlockRequest";
import { MemberBlockRemovedResponse } from "../../../Accessors/MemberBlockAccessor/Responses/MemberBlockRemovedResponse";
import { MemberBlockStoredResponse } from "../../../Accessors/MemberBlockAccessor/Responses/MemberBlockStoredResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadProfileByIdRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadProfileByIdRequest";
import { ProfileLoadedResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileLoadedResponse";
import { ProfileNotFoundResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileNotFoundResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { ownProfileSubject } from "../ownProfileSubject";
import { permit } from "../permit";
import type { SetMemberBlockRequest } from "../Requests/SetMemberBlockRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { MemberBlockRejectedResponse } from "../Responses/MemberBlockRejectedResponse";
import { MemberBlockSetResponse } from "../Responses/MemberBlockSetResponse";
import { NoSuchProfileResponse } from "../Responses/NoSuchProfileResponse";
import { unavailable } from "../unavailable";

type Result =
  | MemberBlockSetResponse
  | MemberBlockRejectedResponse
  | NoSuchProfileResponse
  | ActionForbiddenResponse
  | AccountUnavailableResponse;

// Permission, then the target, then the write (#23). Taking back a level the actor
// never set is not an error: the answer is the same "none".
export class SetMemberBlockHandler implements IHandler<SetMemberBlockRequest, Result> {
  constructor(
    private readonly memberBlocks: IMemberBlockAccessor,
    private readonly profiles: IProfileAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: SetMemberBlockRequest): Promise<Result> {
    const { correlationId, actor, targetProfileId, level, timestamp } = request;
    const context = { correlationId, timestamp };

    const refused = await permit(
      this.permissions,
      actor,
      "member.block",
      ownProfileSubject(actor),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    if (actor.kind === "visitor") {
      return new AccountUnavailableResponse(
        correlationId,
        "member.block granted to a visitor",
      );
    }
    if (targetProfileId === actor.profile.id) {
      return new MemberBlockRejectedResponse(correlationId, "self");
    }

    if (level === "none") {
      const removed = await this.memberBlocks.remove(
        new RemoveMemberBlockRequest(actor.profile.id, targetProfileId, context),
      );
      if (!(removed instanceof MemberBlockRemovedResponse)) {
        return unavailable(correlationId, removed, "memberBlocks.remove");
      }
      return new MemberBlockSetResponse(correlationId, "none");
    }

    const target = await this.profiles.load(
      new LoadProfileByIdRequest(targetProfileId, context),
    );
    if (target instanceof ProfileNotFoundResponse) {
      return new NoSuchProfileResponse(correlationId);
    }
    if (!(target instanceof ProfileLoadedResponse)) {
      return unavailable(correlationId, target, "profiles.load");
    }
    if (target.profile.status === "erased") {
      return new MemberBlockRejectedResponse(correlationId, "erased");
    }
    const stored = await this.memberBlocks.store(
      new StoreMemberBlockRequest(actor.profile.id, targetProfileId, level, context),
    );
    if (!(stored instanceof MemberBlockStoredResponse)) {
      return unavailable(correlationId, stored, "memberBlocks.store");
    }
    return new MemberBlockSetResponse(correlationId, level);
  }
}
