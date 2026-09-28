import type { IHandler } from "../../../Common/IHandler";
import type { FakeProfileState } from "../FakeProfileState";
import type { RemoveOrphanAuthUserRequest } from "../Requests/RemoveOrphanAuthUserRequest";
import { OrphanAuthUserRemovedResponse } from "../Responses/OrphanAuthUserRemovedResponse";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileLoadedResponse } from "../Responses/ProfileLoadedResponse";

type Result =
  OrphanAuthUserRemovedResponse | ProfileLoadedResponse | ProfileAccessFailedResponse;

// The fake has no auth users: it records the ids it would delete, for the tests.
export class FakeRemoveOrphanAuthUserHandler implements IHandler<
  RemoveOrphanAuthUserRequest,
  Result
> {
  constructor(private readonly state: FakeProfileState) {}

  handle(request: RemoveOrphanAuthUserRequest): Promise<Result> {
    const { id, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new ProfileAccessFailedResponse(correlationId, "PROFILE_FAKE_RESULT=fail"),
      );
    }
    const profile = this.state.profiles.get(id);
    if (profile !== undefined) {
      return Promise.resolve(new ProfileLoadedResponse(correlationId, profile));
    }
    this.state.removedAuthUsers.add(id);
    return Promise.resolve(new OrphanAuthUserRemovedResponse(correlationId));
  }
}
