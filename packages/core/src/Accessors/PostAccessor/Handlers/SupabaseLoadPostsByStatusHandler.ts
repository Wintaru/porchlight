import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadPostsByStatusRequest } from "../Requests/LoadPostsByStatusRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostsLoadedResponse } from "../Responses/PostsLoadedResponse";
import { POST_COLUMNS, toPost } from "../toPost";

// A real backlog is still a small number of rows (SPEC.md §7's queue is a working set,
// not a feed); this bound exists so a runaway backlog degrades to "the oldest ones are
// missing from this page" rather than an unbounded query.
const MAX_ROWS = 500;

export class SupabaseLoadPostsByStatusHandler implements IHandler<
  LoadPostsByStatusRequest,
  PostsLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadPostsByStatusRequest,
  ): Promise<PostsLoadedResponse | PostAccessFailedResponse> {
    const { data, error } = await this.db
      .from("posts")
      .select(POST_COLUMNS)
      .eq("status", request.status)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    if (error) {
      return new PostAccessFailedResponse(request.correlationId, error.message);
    }
    return new PostsLoadedResponse(request.correlationId, data.map(toPost));
  }
}
