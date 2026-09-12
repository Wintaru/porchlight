import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadPostsByAuthorRequest } from "../Requests/LoadPostsByAuthorRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostsLoadedResponse } from "../Responses/PostsLoadedResponse";
import { POST_COLUMNS, toPost } from "../toPost";

// One member's posts is a bounded list (an author writes hundreds, not millions), so no
// page here yet. The public lists live in the read-model and page there.
export class SupabaseLoadPostsByAuthorHandler implements IHandler<
  LoadPostsByAuthorRequest,
  PostsLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadPostsByAuthorRequest,
  ): Promise<PostsLoadedResponse | PostAccessFailedResponse> {
    const { data, error } = await this.db
      .from("posts")
      .select(POST_COLUMNS)
      .eq("author_id", request.profileId)
      .order("created_at", { ascending: false });
    if (error) {
      return new PostAccessFailedResponse(request.correlationId, error.message);
    }
    return new PostsLoadedResponse(request.correlationId, data.map(toPost));
  }
}
