import type { IHandler } from "../../../Common/IHandler";
import type { FakeProfileState } from "../FakeProfileState";
import type { LoadProfileByIdRequest } from "../Requests/LoadProfileByIdRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileLoadedResponse } from "../Responses/ProfileLoadedResponse";
import { ProfileNotFoundResponse } from "../Responses/ProfileNotFoundResponse";

export class FakeLoadProfileByIdHandler implements IHandler<
  LoadProfileByIdRequest,
  ProfileLoadedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly state: FakeProfileState) {}

  handle(
    request: LoadProfileByIdRequest,
  ): Promise<
    ProfileLoadedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
  > {
    if (this.state.failing) {
      return Promise.resolve(
        new ProfileAccessFailedResponse(
          request.correlationId,
          "PROFILE_FAKE_RESULT=fail",
        ),
      );
    }
    const profile = this.state.profiles.get(request.id);
    return Promise.resolve(
      profile === undefined
        ? new ProfileNotFoundResponse(request.correlationId)
        : new ProfileLoadedResponse(request.correlationId, profile),
    );
  }
}
