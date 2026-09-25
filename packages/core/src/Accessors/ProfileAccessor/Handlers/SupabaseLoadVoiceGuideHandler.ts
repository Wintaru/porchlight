import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadVoiceGuideRequest } from "../Requests/LoadVoiceGuideRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileNotFoundResponse } from "../Responses/ProfileNotFoundResponse";
import { VoiceGuideLoadedResponse } from "../Responses/VoiceGuideLoadedResponse";

export class SupabaseLoadVoiceGuideHandler implements IHandler<
  LoadVoiceGuideRequest,
  VoiceGuideLoadedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadVoiceGuideRequest,
  ): Promise<
    VoiceGuideLoadedResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
  > {
    const { data, error } = await this.db
      .from("profiles")
      .select("voice_guide_md")
      .eq("id", request.profileId)
      .maybeSingle();
    if (error) {
      return new ProfileAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new ProfileNotFoundResponse(request.correlationId);
    }
    return new VoiceGuideLoadedResponse(request.correlationId, data.voice_guide_md);
  }
}
