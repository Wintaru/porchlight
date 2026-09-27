import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadUnusedMediaRequest } from "../Requests/LoadUnusedMediaRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { UnusedMediaLoadedResponse } from "../Responses/UnusedMediaLoadedResponse";

type Result = UnusedMediaLoadedResponse | MediaAssetAccessFailedResponse;

export class SupabaseLoadUnusedMediaHandler implements IHandler<
  LoadUnusedMediaRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: LoadUnusedMediaRequest): Promise<Result> {
    if (request.mediaIds.length === 0) {
      return new UnusedMediaLoadedResponse(request.correlationId, []);
    }
    const args = { p_media_ids: [...request.mediaIds], p_owner_id: request.ownerId };
    const { data, error } = await this.db.rpc(
      "unused_media",
      request.postId === null ? args : { ...args, p_post_id: request.postId },
    );
    if (error) {
      return new MediaAssetAccessFailedResponse(request.correlationId, error.message);
    }
    return new UnusedMediaLoadedResponse(request.correlationId, data);
  }
}
