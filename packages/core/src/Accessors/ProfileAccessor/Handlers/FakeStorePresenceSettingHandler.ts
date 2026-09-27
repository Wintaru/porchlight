import type { IHandler } from "../../../Common/IHandler";
import type { FakeProfileState } from "../FakeProfileState";
import type { StorePresenceSettingRequest } from "../Requests/StorePresenceSettingRequest";
import { PresenceSettingStoredResponse } from "../Responses/PresenceSettingStoredResponse";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileNotFoundResponse } from "../Responses/ProfileNotFoundResponse";

export class FakeStorePresenceSettingHandler implements IHandler<
  StorePresenceSettingRequest,
  PresenceSettingStoredResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly state: FakeProfileState) {}

  handle(
    request: StorePresenceSettingRequest,
  ): Promise<
    PresenceSettingStoredResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
  > {
    if (this.state.failing) {
      return Promise.resolve(
        new ProfileAccessFailedResponse(
          request.correlationId,
          "PROFILE_FAKE_RESULT=fail",
        ),
      );
    }
    if (!this.state.profiles.has(request.profileId)) {
      return Promise.resolve(new ProfileNotFoundResponse(request.correlationId));
    }
    if (request.visible) {
      this.state.presenceHidden.delete(request.profileId);
    } else {
      this.state.presenceHidden.add(request.profileId);
    }
    return Promise.resolve(new PresenceSettingStoredResponse(request.correlationId));
  }
}
