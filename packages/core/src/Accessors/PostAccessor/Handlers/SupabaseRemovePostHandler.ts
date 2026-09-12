import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { RemovePostRequest } from "../Requests/RemovePostRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostNotFoundResponse } from "../Responses/PostNotFoundResponse";
import { PostRemovedResponse } from "../Responses/PostRemovedResponse";

export class SupabaseRemovePostHandler implements IHandler<
  RemovePostRequest,
  PostRemovedResponse | PostNotFoundResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: RemovePostRequest,
  ): Promise<PostRemovedResponse | PostNotFoundResponse | PostAccessFailedResponse> {
    const { data, error } = await this.db
      .from("posts")
      .delete()
      .eq("id", request.id)
      .select("id")
      .maybeSingle();
    if (error) {
      return new PostAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new PostNotFoundResponse(request.correlationId);
    }
    return new PostRemovedResponse(request.correlationId);
  }
}
