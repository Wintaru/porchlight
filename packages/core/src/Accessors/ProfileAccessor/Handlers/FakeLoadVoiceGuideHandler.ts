import type { IHandler } from "../../../Common/IHandler";
import type { FakeProfileState } from "../FakeProfileState";
import type { LoadVoiceGuideRequest } from "../Requests/LoadVoiceGuideRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileNotFoundResponse } from "../Responses/ProfileNotFoundResponse";
import { VoiceGuideLoadedResponse } from "../Responses/VoiceGuideLoadedResponse";

export class FakeLoadVoiceGuideHandler implements IHandler<
  LoadVoiceGuideRequest,
  VoiceGuideLoadedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly state: FakeProfileState) {}

  handle(
    request: LoadVoiceGuideRequest,
  ): Promise<
    VoiceGuideLoadedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
  > {
    const { correlationId, profileId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new ProfileAccessFailedResponse(correlationId, "PROFILE_FAKE_RESULT=fail"),
      );
    }
    if (!this.state.profiles.has(profileId)) {
      return Promise.resolve(new ProfileNotFoundResponse(correlationId));
    }
    return Promise.resolve(
      new VoiceGuideLoadedResponse(
        correlationId,
        this.state.voiceGuides.get(profileId) ?? null,
      ),
    );
  }
}
