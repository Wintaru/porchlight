import type { IHandler } from "../../../Common/IHandler";
import { VOICE_GUIDE_REVISIONS_KEPT } from "../../../Common/VoiceGuideRevision";
import type { FakeProfileState } from "../FakeProfileState";
import type { StoreVoiceGuideRequest } from "../Requests/StoreVoiceGuideRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileNotFoundResponse } from "../Responses/ProfileNotFoundResponse";
import { VoiceGuideStoredResponse } from "../Responses/VoiceGuideStoredResponse";

export class FakeStoreVoiceGuideHandler implements IHandler<
  StoreVoiceGuideRequest,
  VoiceGuideStoredResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly state: FakeProfileState) {}

  handle(
    request: StoreVoiceGuideRequest,
  ): Promise<
    VoiceGuideStoredResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
  > {
    const { correlationId, profileId, guideMd } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new ProfileAccessFailedResponse(correlationId, "PROFILE_FAKE_RESULT=fail"),
      );
    }
    if (!this.state.profiles.has(profileId)) {
      return Promise.resolve(new ProfileNotFoundResponse(correlationId));
    }
    // What the trigger does: keep the replaced text when it changes, the newest
    // VOICE_GUIDE_REVISIONS_KEPT only.
    const before = this.state.voiceGuides.get(profileId);
    if (before !== undefined && before !== guideMd) {
      const kept = [
        ...(this.state.voiceGuideRevisions.get(profileId) ?? []),
        { guideMd: before, replacedAt: request.timestamp },
      ];
      this.state.voiceGuideRevisions.set(
        profileId,
        kept.slice(-VOICE_GUIDE_REVISIONS_KEPT),
      );
    }
    if (guideMd === null) {
      this.state.voiceGuides.delete(profileId);
    } else {
      this.state.voiceGuides.set(profileId, guideMd);
    }
    return Promise.resolve(new VoiceGuideStoredResponse(correlationId));
  }
}
