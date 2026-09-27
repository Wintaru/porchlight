import type { IHandler } from "../../../Common/IHandler";
import type { FakeProfileState } from "../FakeProfileState";
import type { LoadPresenceSettingRequest } from "../Requests/LoadPresenceSettingRequest";
import { PresenceSettingLoadedResponse } from "../Responses/PresenceSettingLoadedResponse";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileNotFoundResponse } from "../Responses/ProfileNotFoundResponse";

export class FakeLoadPresenceSettingHandler implements IHandler<
  LoadPresenceSettingRequest,
  PresenceSettingLoadedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly state: FakeProfileState) {}

  handle(
    request: LoadPresenceSettingRequest,
  ): Promise<
    PresenceSettingLoadedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
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
    return Promise.resolve(
      new PresenceSettingLoadedResponse(
        request.correlationId,
        !this.state.presenceHidden.has(request.profileId),
      ),
    );
  }
}
