import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { UploadStorageObjectRequest } from "../Requests/UploadStorageObjectRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectUploadedResponse } from "../Responses/StorageObjectUploadedResponse";

type Result = StorageObjectUploadedResponse | MediaStorageAccessFailedResponse;

// A published copy is immutable once written: its path carries the asset's own id, so
// the same asset always writes the same bytes, and a retry after a half-finished publish
// overwrites rather than failing on the object it left behind.
const IMMUTABLE_CACHE_SECONDS = "31536000";

export class SupabaseUploadStorageObjectHandler implements IHandler<
  UploadStorageObjectRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: UploadStorageObjectRequest): Promise<Result> {
    const { bucket, path, bytes, contentType, correlationId } = request;
    const { error } = await this.db.storage.from(bucket).upload(path, bytes, {
      contentType,
      cacheControl: IMMUTABLE_CACHE_SECONDS,
      upsert: true,
    });
    if (error) {
      return new MediaStorageAccessFailedResponse(correlationId, error.message);
    }
    return new StorageObjectUploadedResponse(correlationId);
  }
}
