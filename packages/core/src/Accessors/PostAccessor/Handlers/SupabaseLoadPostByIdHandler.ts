import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadPostByIdRequest } from "../Requests/LoadPostByIdRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostLoadedResponse } from "../Responses/PostLoadedResponse";
import { PostNotFoundResponse } from "../Responses/PostNotFoundResponse";
import { POST_COLUMNS, toPost } from "../toPost";

export class SupabaseLoadPostByIdHandler implements IHandler<
  LoadPostByIdRequest,
  PostLoadedResponse | PostNotFoundResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadPostByIdRequest,
  ): Promise<PostLoadedResponse | PostNotFoundResponse | PostAccessFailedResponse> {
    const { data, error } = await this.db
      .from("posts")
      .select(POST_COLUMNS)
      .eq("id", request.id)
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
