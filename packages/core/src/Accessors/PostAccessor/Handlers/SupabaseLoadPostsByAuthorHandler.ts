import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { readAllPages } from "../../../Utilities/collections/readAllPages";
import type { LoadPostsByAuthorRequest } from "../Requests/LoadPostsByAuthorRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostsLoadedResponse } from "../Responses/PostsLoadedResponse";
import { POST_COLUMNS, toPost } from "../toPost";

// One member's posts, newest first. With no limit the read pages past PostgREST's row
// cap, so an export holds every post. The public lists live in the read-model.
export class SupabaseLoadPostsByAuthorHandler implements IHandler<
  LoadPostsByAuthorRequest,
  PostsLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadPostsByAuthorRequest,
  ): Promise<PostsLoadedResponse | PostAccessFailedResponse> {
    const { status, limit } = request.filter;
    const ordered = () => {
      let query = this.db
        .from("posts")
        .select(POST_COLUMNS)
        .eq("author_id", request.profileId);
      if (status !== null) {
        query = query.eq("status", status);
      }
      if (!request.withPrivate) {
        query = query.neq("visibility", "private");
      }
      // `id` breaks ties, so a capped list is the same list on every call.
      return query
        .order("created_at", { ascending: false })
        .order("id", { ascending: true });
    };
    const read =
      limit === null
        ? await readAllPages((from, to) => ordered().range(from, to))
        : await ordered()
            .limit(limit)
            .then(({ data, error }) =>
              error === null ? { rows: data } : { error: error.message },
            );
    if ("error" in read) {
      return new PostAccessFailedResponse(request.correlationId, read.error);
    }
    return new PostsLoadedResponse(request.correlationId, read.rows.map(toPost));
  }
}
