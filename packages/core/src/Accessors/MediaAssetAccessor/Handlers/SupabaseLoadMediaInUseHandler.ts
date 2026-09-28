import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadMediaInUseRequest } from "../Requests/LoadMediaInUseRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaInUseLoadedResponse } from "../Responses/MediaInUseLoadedResponse";

type Result = MediaInUseLoadedResponse | MediaAssetAccessFailedResponse;

export class SupabaseLoadMediaInUseHandler implements IHandler<
  LoadMediaInUseRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: LoadMediaInUseRequest): Promise<Result> {
    const { data, error } = await this.db.rpc("media_in_use", {
      p_media_id: request.mediaId,
    });
    if (error) {
      return new MediaAssetAccessFailedResponse(request.correlationId, error.message);
    }
    return new MediaInUseLoadedResponse(request.correlationId, data);
  }
}
