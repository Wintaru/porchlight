import type { IPostAccessor } from "../../Accessors/PostAccessor/IPostAccessor";
import { LoadVoiceSamplesRequest } from "../../Accessors/PostAccessor/Requests/LoadVoiceSamplesRequest";
import { VoiceSamplesLoadedResponse } from "../../Accessors/PostAccessor/Responses/VoiceSamplesLoadedResponse";
import type { IProfileAccessor } from "../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadVoiceGuideRequest } from "../../Accessors/ProfileAccessor/Requests/LoadVoiceGuideRequest";
import { VoiceGuideLoadedResponse } from "../../Accessors/ProfileAccessor/Responses/VoiceGuideLoadedResponse";
import type { RequestContext } from "../../Common/RequestContext";
import type { VoiceGuide } from "../../Common/VoiceGuide";
import { DEFAULT_BANNED_PHRASES, VOICE_SAMPLE_COUNT } from "../../Common/VoiceGuideRules";
import type { AccountUnavailableResponse } from "./Responses/AccountUnavailableResponse";
import { unavailable } from "./unavailable";

// The guide as an agent reads it (SPEC.md §17): the member's text, the default banned
// phrases, and their latest hand-written posts. The two reads are independent, so they
// go out together.
export async function loadVoiceGuide(
  profiles: IProfileAccessor,
  posts: IPostAccessor,
  profileId: string,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<VoiceGuide | AccountUnavailableResponse> {
  const [guide, samples] = await Promise.all([
    profiles.load(new LoadVoiceGuideRequest(profileId, context)),
    posts.load(new LoadVoiceSamplesRequest(profileId, VOICE_SAMPLE_COUNT, context)),
  ]);
  if (!(guide instanceof VoiceGuideLoadedResponse)) {
    return unavailable(context.correlationId, guide, "profiles.load");
  }
  if (!(samples instanceof VoiceSamplesLoadedResponse)) {
    return unavailable(context.correlationId, samples, "posts.load");
  }
  return {
    guideMd: guide.guideMd,
    bannedPhrases: DEFAULT_BANNED_PHRASES,
    samples: samples.samples,
  };
}
