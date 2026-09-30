import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { chunked } from "../../../Utilities/collections/chunked";
import type { RemoveStorageObjectsRequest } from "../Requests/RemoveStorageObjectsRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectRemovedResponse } from "../Responses/StorageObjectRemovedResponse";

type Result = StorageObjectRemovedResponse | MediaStorageAccessFailedResponse;

// Paths per call: Storage takes a list, and a bounded one keeps each request small.
const PATHS_PER_CALL = 100;

export class SupabaseRemoveStorageObjectsHandler implements IHandler<
  RemoveStorageObjectsRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: RemoveStorageObjectsRequest): Promise<Result> {
    const { bucket, paths, correlationId } = request;
    for (const run of chunked(paths, PATHS_PER_CALL)) {
      const { error } = await this.db.storage.from(bucket).remove(run);
      if (error) {
        return new MediaStorageAccessFailedResponse(correlationId, error.message);
      }
    }
    return new StorageObjectRemovedResponse(correlationId);
  }
}
