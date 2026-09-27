import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { PostRevision } from "../../../Common/PostRevision";
import type { LoadPostRevisionsByAuthorRequest } from "../Requests/LoadPostRevisionsByAuthorRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostRevisionsLoadedResponse } from "../Responses/PostRevisionsLoadedResponse";
import { POST_REVISION_COLUMNS, toPostRevision } from "../toPostRevision";

// PostgREST answers at most 1000 rows per request, and an export must hold every
// version, so the read pages until a short page says it is done.
const PAGE = 1000;

export class SupabaseLoadPostRevisionsByAuthorHandler implements IHandler<
  LoadPostRevisionsByAuthorRequest,
  PostRevisionsLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadPostRevisionsByAuthorRequest,
  ): Promise<PostRevisionsLoadedResponse | PostAccessFailedResponse> {
    const revisions: PostRevision[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.db
        .from("post_revisions")
        .select(`${POST_REVISION_COLUMNS}, post:posts!inner(author_id)`)
        .eq("post.author_id", request.profileId)
        .order("replaced_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) {
        return new PostAccessFailedResponse(request.correlationId, error.message);
      }
      revisions.push(...data.map(toPostRevision));
      if (data.length < PAGE) {
        return new PostRevisionsLoadedResponse(request.correlationId, revisions);
      }
    }
  }
}
