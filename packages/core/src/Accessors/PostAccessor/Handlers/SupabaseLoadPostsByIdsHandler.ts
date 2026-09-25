import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { Post } from "../../../Common/Post";
import { chunked } from "../../../Utilities/collections/chunked";
import type { LoadPostsByIdsRequest } from "../Requests/LoadPostsByIdsRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostsLoadedResponse } from "../Responses/PostsLoadedResponse";
import { POST_COLUMNS, toPost } from "../toPost";

const IDS_PER_QUERY = 100;

export class SupabaseLoadPostsByIdsHandler implements IHandler<
  LoadPostsByIdsRequest,
  PostsLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadPostsByIdsRequest,
  ): Promise<PostsLoadedResponse | PostAccessFailedResponse> {
    const posts: Post[] = [];
    for (const ids of chunked([...new Set(request.ids)], IDS_PER_QUERY)) {
      const { data, error } = await this.db
        .from("posts")
        .select(POST_COLUMNS)
        .in("id", ids);
      if (error) {
        return new PostAccessFailedResponse(request.correlationId, error.message);
      }
      posts.push(...data.map(toPost));
    }
    return new PostsLoadedResponse(request.correlationId, posts);
  }
}
