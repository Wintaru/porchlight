import type { IHandler } from "../../../Common/IHandler";
import type { FakeProfileState } from "../FakeProfileState";
import type { CountProfilesRequest } from "../Requests/CountProfilesRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileCountResponse } from "../Responses/ProfileCountResponse";

export class FakeCountProfilesHandler implements IHandler<
  CountProfilesRequest,
  ProfileCountResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly state: FakeProfileState) {}

  handle(
    request: CountProfilesRequest,
  ): Promise<ProfileCountResponse | ProfileAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new ProfileAccessFailedResponse(
          request.correlationId,
          "PROFILE_FAKE_RESULT=fail",
        ),
      );
    }
    return Promise.resolve(
      new ProfileCountResponse(request.correlationId, this.state.profiles.size),
    );
  }
}
