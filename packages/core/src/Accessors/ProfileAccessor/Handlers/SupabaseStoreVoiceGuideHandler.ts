import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreVoiceGuideRequest } from "../Requests/StoreVoiceGuideRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfileNotFoundResponse } from "../Responses/ProfileNotFoundResponse";
import { VoiceGuideStoredResponse } from "../Responses/VoiceGuideStoredResponse";

export class SupabaseStoreVoiceGuideHandler implements IHandler<
  StoreVoiceGuideRequest,
  VoiceGuideStoredResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreVoiceGuideRequest,
  ): Promise<
    VoiceGuideStoredResponse | ProfileNotFoundResponse | ProfileAccessFailedResponse
  > {
    const { data, error } = await this.db
      .from("profiles")
      .update({ voice_guide_md: request.guideMd })
      .eq("id", request.profileId)
      .select("id")
      .maybeSingle();
    if (error) {
      return new ProfileAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new ProfileNotFoundResponse(request.correlationId);
    }
    return new VoiceGuideStoredResponse(request.correlationId);
  }
}
