import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadPostBySlugRequest } from "../Requests/LoadPostBySlugRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostLoadedResponse } from "../Responses/PostLoadedResponse";
import { PostNotFoundResponse } from "../Responses/PostNotFoundResponse";
import { POST_COLUMNS, toPost } from "../toPost";

export class SupabaseLoadPostBySlugHandler implements IHandler<
  LoadPostBySlugRequest,
  PostLoadedResponse | PostNotFoundResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadPostBySlugRequest,
  ): Promise<PostLoadedResponse | PostNotFoundResponse | PostAccessFailedResponse> {
    const { data, error } = await this.db
      .from("posts")
      .select(POST_COLUMNS)
      .eq("slug", request.slug)
      .maybeSingle();
    if (error) {
      return new PostAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new PostNotFoundResponse(request.correlationId);
    }
    return new PostLoadedResponse(request.correlationId, toPost(data));
  }
}
