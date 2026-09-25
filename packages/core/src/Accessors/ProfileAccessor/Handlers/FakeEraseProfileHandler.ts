import type { IHandler } from "../../../Common/IHandler";
import type { FakeProfileState } from "../FakeProfileState";
import type { EraseProfileRequest } from "../Requests/EraseProfileRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileErasedResponse } from "../Responses/ProfileErasedResponse";
import { ProfileNotFoundResponse } from "../Responses/ProfileNotFoundResponse";

type Result =
  ProfileErasedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse;

// Mirrors FakeClaimAnonymousAuthorHandler's scope: the fake profile store is the one
// table this touches. It does not also clear a fake post/comment/media store — nothing
// in the fake world runs `erase_account`'s cross-table deletes, the same simplification
// the anonymous claim's fake already accepted for a real-only Postgres function.
export class FakeEraseProfileHandler implements IHandler<EraseProfileRequest, Result> {
  constructor(private readonly state: FakeProfileState) {}

  handle(request: EraseProfileRequest): Promise<Result> {
    const { id, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new ProfileAccessFailedResponse(correlationId, "PROFILE_FAKE_RESULT=fail"),
      );
    }
    const current = this.state.profiles.get(id);
    if (current === undefined) {
      return Promise.resolve(new ProfileNotFoundResponse(correlationId));
    }
    this.state.profiles.set(id, {
      ...current,
      status: "erased",
      displayName: null,
      avatarUrl: null,
      bio: null,
    });
    this.state.voiceGuides.delete(id);
    return Promise.resolve(new ProfileErasedResponse(correlationId));
  }
}
