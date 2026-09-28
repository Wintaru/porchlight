import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadVoiceGuideRevisionsRequest } from "../Requests/LoadVoiceGuideRevisionsRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { VoiceGuideRevisionsLoadedResponse } from "../Responses/VoiceGuideRevisionsLoadedResponse";

// The trigger keeps at most 50 a member, so one read takes them all.
export class SupabaseLoadVoiceGuideRevisionsHandler implements IHandler<
  LoadVoiceGuideRevisionsRequest,
  VoiceGuideRevisionsLoadedResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadVoiceGuideRevisionsRequest,
  ): Promise<VoiceGuideRevisionsLoadedResponse | ProfileAccessFailedResponse> {
    const { data, error } = await this.db
      .from("voice_guide_revisions")
      .select("guide_md, replaced_at")
      .eq("profile_id", request.profileId)
      .order("replaced_at", { ascending: false })
      .order("id", { ascending: false });
    if (error) {
      return new ProfileAccessFailedResponse(request.correlationId, error.message);
    }
    return new VoiceGuideRevisionsLoadedResponse(
      request.correlationId,
      data.map((row) => ({
        guideMd: row.guide_md,
        replacedAt: new Date(row.replaced_at),
      })),
    );
  }
}
