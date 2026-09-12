import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { isRetained } from "../PostgresErrorCode";
import type { RemoveMediaAssetRequest } from "../Requests/RemoveMediaAssetRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaAssetRemovedResponse } from "../Responses/MediaAssetRemovedResponse";
import { MediaAssetRetainedResponse } from "../Responses/MediaAssetRetainedResponse";

type Result =
  MediaAssetRemovedResponse | MediaAssetRetainedResponse | MediaAssetAccessFailedResponse;

export class SupabaseRemoveMediaAssetHandler implements IHandler<
  RemoveMediaAssetRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: RemoveMediaAssetRequest): Promise<Result> {
    const { id, correlationId } = request;
    const { error } = await this.db.from("media_assets").delete().eq("id", id);
    if (error) {
      return isRetained(error)
        ? new MediaAssetRetainedResponse(correlationId)
        : new MediaAssetAccessFailedResponse(correlationId, error.message);
    }
    return new MediaAssetRemovedResponse(correlationId);
  }
}
