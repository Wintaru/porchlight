import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { CopyStorageObjectRequest } from "../Requests/CopyStorageObjectRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectCopiedResponse } from "../Responses/StorageObjectCopiedResponse";

type Result = StorageObjectCopiedResponse | MediaStorageAccessFailedResponse;

// A copy refuses to replace an object, and a published copy's key is fixed by its
// asset's id. So a retry after a half-finished publish first clears the key: the object
// there can only be an earlier copy of the same bytes.
export class SupabaseCopyStorageObjectHandler implements IHandler<
  CopyStorageObjectRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: CopyStorageObjectRequest): Promise<Result> {
    const { fromBucket, fromPath, toBucket, toPath, correlationId } = request;
    const cleared = await this.db.storage.from(toBucket).remove([toPath]);
    if (cleared.error) {
      return new MediaStorageAccessFailedResponse(correlationId, cleared.error.message);
    }
    const { error } = await this.db.storage
      .from(fromBucket)
      .copy(fromPath, toPath, { destinationBucket: toBucket });
    if (error) {
      return new MediaStorageAccessFailedResponse(correlationId, error.message);
    }
    return new StorageObjectCopiedResponse(correlationId);
  }
}
