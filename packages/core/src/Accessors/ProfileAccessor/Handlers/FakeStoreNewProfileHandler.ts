import type { IHandler } from "../../../Common/IHandler";
import type { Profile } from "../../../Common/Profile";
import type { FakeProfileState } from "../FakeProfileState";
import type { StoreNewProfileRequest } from "../Requests/StoreNewProfileRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileHandleTakenResponse } from "../Responses/ProfileHandleTakenResponse";
import { ProfileStoredResponse } from "../Responses/ProfileStoredResponse";

// Mirrors the schema's defaults and its two unique constraints (id, handle).
export class FakeStoreNewProfileHandler implements IHandler<
  StoreNewProfileRequest,
  ProfileStoredResponse | ProfileHandleTakenResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly state: FakeProfileState) {}

  handle(
    request: StoreNewProfileRequest,
  ): Promise<
    ProfileStoredResponse | ProfileHandleTakenResponse | ProfileAccessFailedResponse
  > {
    const { profile, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new ProfileAccessFailedResponse(correlationId, "PROFILE_FAKE_RESULT=fail"),
      );
    }
    if (this.state.byHandle(profile.handle) !== undefined) {
      return Promise.resolve(
        new ProfileHandleTakenResponse(correlationId, profile.handle),
      );
    }
    if (this.state.profiles.has(profile.id)) {
      return Promise.resolve(
        new ProfileAccessFailedResponse(
          correlationId,
          `profile ${profile.id} already exists`,
        ),
      );
    }
    const stored: Profile = {
      ...profile,
      bio: null,
      status: "active",
      createdAt: request.timestamp,
    };
    this.state.profiles.set(stored.id, stored);
    return Promise.resolve(new ProfileStoredResponse(correlationId, stored));
  }
}
