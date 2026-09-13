import type { IHandler } from "../../../Common/IHandler";
import type { Profile } from "../../../Common/Profile";
import type { FakeProfileState } from "../FakeProfileState";
import type { StoreProfileChangesRequest } from "../Requests/StoreProfileChangesRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileHandleTakenResponse } from "../Responses/ProfileHandleTakenResponse";
import { ProfileNotFoundResponse } from "../Responses/ProfileNotFoundResponse";
import { ProfileStoredResponse } from "../Responses/ProfileStoredResponse";

export class FakeStoreProfileChangesHandler implements IHandler<
  StoreProfileChangesRequest,
  | ProfileStoredResponse
  | ProfileNotFoundResponse
  | ProfileHandleTakenResponse
  | ProfileAccessFailedResponse
> {
  constructor(private readonly state: FakeProfileState) {}

  handle(
    request: StoreProfileChangesRequest,
  ): Promise<
    | ProfileStoredResponse
    | ProfileNotFoundResponse
    | ProfileHandleTakenResponse
    | ProfileAccessFailedResponse
  > {
    const { id, changes, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new ProfileAccessFailedResponse(correlationId, "PROFILE_FAKE_RESULT=fail"),
      );
    }
    const current = this.state.profiles.get(id);
    if (current === undefined) {
      return Promise.resolve(new ProfileNotFoundResponse(correlationId));
    }
    const handle = changes.handle ?? current.handle;
    const holder = this.state.byHandle(handle);
    if (holder !== undefined && holder.id !== id) {
      return Promise.resolve(new ProfileHandleTakenResponse(correlationId, handle));
    }
    const stored: Profile = {
      ...current,
      handle,
      displayName:
        changes.displayName === undefined ? current.displayName : changes.displayName,
      bio: changes.bio === undefined ? current.bio : changes.bio,
      avatarUrl: changes.avatarUrl === undefined ? current.avatarUrl : changes.avatarUrl,
      trustLevel: changes.trustLevel ?? current.trustLevel,
      status: changes.status ?? current.status,
    };
    this.state.profiles.set(id, stored);
    return Promise.resolve(new ProfileStoredResponse(correlationId, stored));
  }
}
