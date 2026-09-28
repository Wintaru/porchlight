import type { IHandler } from "../../../Common/IHandler";
import type { FakeProfileState } from "../FakeProfileState";
import type { LoadPresenceMemberRequest } from "../Requests/LoadPresenceMemberRequest";
import { PresenceMemberLoadedResponse } from "../Responses/PresenceMemberLoadedResponse";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileNotFoundResponse } from "../Responses/ProfileNotFoundResponse";

export class FakeLoadPresenceMemberHandler implements IHandler<
  LoadPresenceMemberRequest,
  PresenceMemberLoadedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly state: FakeProfileState) {}

  handle(
    request: LoadPresenceMemberRequest,
  ): Promise<
    PresenceMemberLoadedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
  > {
    if (this.state.failing) {
      return Promise.resolve(
        new ProfileAccessFailedResponse(
          request.correlationId,
          "PROFILE_FAKE_RESULT=fail",
        ),
      );
    }
    const profile = this.state.profiles.get(request.profileId);
    return Promise.resolve(
      profile === undefined
        ? new ProfileNotFoundResponse(request.correlationId)
        : new PresenceMemberLoadedResponse(
            request.correlationId,
            profile,
            !this.state.presenceHidden.has(request.profileId),
          ),
    );
  }
}
