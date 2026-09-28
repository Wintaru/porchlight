import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadPostRevisionsRequest } from "../Requests/LoadPostRevisionsRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostRevisionsLoadedResponse } from "../Responses/PostRevisionsLoadedResponse";
import { POST_REVISION_COLUMNS, toPostRevision } from "../toPostRevision";

// The history page's read. One post rarely has more than a few dozen saves after it
// went out; the cap keeps a pathological one from loading them all.
export const POST_REVISIONS_PAGE = 100;

export class SupabaseLoadPostRevisionsHandler implements IHandler<
  LoadPostRevisionsRequest,
  PostRevisionsLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadPostRevisionsRequest,
  ): Promise<PostRevisionsLoadedResponse | PostAccessFailedResponse> {
    const { data, error } = await this.db
      .from("post_revisions")
      .select(POST_REVISION_COLUMNS)
      .eq("post_id", request.postId)
      .order("replaced_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(POST_REVISIONS_PAGE);
    if (error) {
      return new PostAccessFailedResponse(request.correlationId, error.message);
    }
    return new PostRevisionsLoadedResponse(
      request.correlationId,
      data.map(toPostRevision),
    );
  }
}
