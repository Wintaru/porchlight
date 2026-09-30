import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { readAllPages } from "../../../Utilities/collections/readAllPages";
import type { LoadPostRevisionsByAuthorRequest } from "../Requests/LoadPostRevisionsByAuthorRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostRevisionsLoadedResponse } from "../Responses/PostRevisionsLoadedResponse";
import { POST_REVISION_COLUMNS, toPostRevision } from "../toPostRevision";

// An export must hold every version, so the read pages past PostgREST's row cap.
export class SupabaseLoadPostRevisionsByAuthorHandler implements IHandler<
  LoadPostRevisionsByAuthorRequest,
  PostRevisionsLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadPostRevisionsByAuthorRequest,
  ): Promise<PostRevisionsLoadedResponse | PostAccessFailedResponse> {
    const read = await readAllPages((from, to) =>
      this.db
        .from("post_revisions")
        .select(`${POST_REVISION_COLUMNS}, post:posts!inner(author_id)`)
        .eq("post.author_id", request.profileId)
        .order("replaced_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    );
    if ("error" in read) {
      return new PostAccessFailedResponse(request.correlationId, read.error);
    }
    return new PostRevisionsLoadedResponse(
      request.correlationId,
      read.rows.map(toPostRevision),
    );
  }
}
