import type { IHandler } from "../../../Common/IHandler";
import type { FakeProfileState } from "../FakeProfileState";
import type { LoadVoiceGuideRevisionsRequest } from "../Requests/LoadVoiceGuideRevisionsRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { VoiceGuideRevisionsLoadedResponse } from "../Responses/VoiceGuideRevisionsLoadedResponse";

export class FakeLoadVoiceGuideRevisionsHandler implements IHandler<
  LoadVoiceGuideRevisionsRequest,
  VoiceGuideRevisionsLoadedResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly state: FakeProfileState) {}

  handle(
    request: LoadVoiceGuideRevisionsRequest,
  ): Promise<VoiceGuideRevisionsLoadedResponse | ProfileAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new ProfileAccessFailedResponse(
          request.correlationId,
          "PROFILE_FAKE_RESULT=fail",
        ),
      );
    }
    return Promise.resolve(
      new VoiceGuideRevisionsLoadedResponse(
        request.correlationId,
        [...(this.state.voiceGuideRevisions.get(request.profileId) ?? [])].reverse(),
      ),
    );
  }
}
