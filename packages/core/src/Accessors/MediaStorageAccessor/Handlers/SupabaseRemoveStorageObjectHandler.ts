import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { RemoveStorageObjectRequest } from "../Requests/RemoveStorageObjectRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectRemovedResponse } from "../Responses/StorageObjectRemovedResponse";

type Result = StorageObjectRemovedResponse | MediaStorageAccessFailedResponse;

export class SupabaseRemoveStorageObjectHandler implements IHandler<
  RemoveStorageObjectRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: RemoveStorageObjectRequest): Promise<Result> {
    const { bucket, path, correlationId } = request;
    const { error } = await this.db.storage.from(bucket).remove([path]);
    if (error) {
      return new MediaStorageAccessFailedResponse(correlationId, error.message);
    }
    return new StorageObjectRemovedResponse(correlationId);
  }
}
