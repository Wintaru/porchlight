import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadStorageObjectInfoRequest } from "../Requests/LoadStorageObjectInfoRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectInfoResponse } from "../Responses/StorageObjectInfoResponse";

type Result = StorageObjectInfoResponse | MediaStorageAccessFailedResponse;

export class SupabaseLoadStorageObjectInfoHandler implements IHandler<
  LoadStorageObjectInfoRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: LoadStorageObjectInfoRequest): Promise<Result> {
    const { bucket, path, correlationId } = request;
    const { data, error } = await this.db.storage.from(bucket).info(path);
    if (error) {
      return new MediaStorageAccessFailedResponse(correlationId, error.message);
    }
    if (data.size === undefined) {
      return new MediaStorageAccessFailedResponse(
        correlationId,
        `storage gave no size for ${bucket}/${path}`,
      );
    }
    return new StorageObjectInfoResponse(
      correlationId,
      data.size,
      data.contentType ?? "application/octet-stream",
    );
  }
}
