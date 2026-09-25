import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadVoiceSamplesRequest } from "../Requests/LoadVoiceSamplesRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { VoiceSamplesLoadedResponse } from "../Responses/VoiceSamplesLoadedResponse";

export class SupabaseLoadVoiceSamplesHandler implements IHandler<
  LoadVoiceSamplesRequest,
  VoiceSamplesLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadVoiceSamplesRequest,
  ): Promise<VoiceSamplesLoadedResponse | PostAccessFailedResponse> {
    const { data, error } = await this.db
      .from("posts")
      .select("title, body_md, published_at")
      .eq("author_id", request.profileId)
      .eq("status", "published")
      .eq("origin", "editor")
      // An agent that rewrote a hand-started draft leaves its text here: that post is
      // the agent's writing too, and the guide must not learn from it.
      .is("agent_draft_md", null)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(request.limit);
    if (error) {
      return new PostAccessFailedResponse(request.correlationId, error.message);
    }
    return new VoiceSamplesLoadedResponse(
      request.correlationId,
      // The `not null` filter narrows `published_at` in the row type as well.
      data.map((row) => ({
        title: row.title,
        bodyMd: row.body_md,
        publishedAt: new Date(row.published_at),
      })),
    );
  }
}
