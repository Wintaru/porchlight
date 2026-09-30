import type { IHandler } from "../../../Common/IHandler";
import type { FakeProfileState } from "../FakeProfileState";
import type { LoadProfilesByIdsRequest } from "../Requests/LoadProfilesByIdsRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfilesLoadedResponse } from "../Responses/ProfilesLoadedResponse";

export class FakeLoadProfilesByIdsHandler implements IHandler<
  LoadProfilesByIdsRequest,
  ProfilesLoadedResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly state: FakeProfileState) {}

  handle(
    request: LoadProfilesByIdsRequest,
  ): Promise<ProfilesLoadedResponse | ProfileAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new ProfileAccessFailedResponse(
          request.correlationId,
          "PROFILE_FAKE_RESULT=fail",
        ),
      );
    }
    const profiles = [...new Set(request.ids)].flatMap(
      (id) => this.state.profiles.get(id) ?? [],
    );
    return Promise.resolve(new ProfilesLoadedResponse(request.correlationId, profiles));
  }
}
