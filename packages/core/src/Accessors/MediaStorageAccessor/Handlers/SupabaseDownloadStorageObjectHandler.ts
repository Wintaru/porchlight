import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { DownloadStorageObjectRequest } from "../Requests/DownloadStorageObjectRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectDownloadedResponse } from "../Responses/StorageObjectDownloadedResponse";

type Result = StorageObjectDownloadedResponse | MediaStorageAccessFailedResponse;

export class SupabaseDownloadStorageObjectHandler implements IHandler<
  DownloadStorageObjectRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: DownloadStorageObjectRequest): Promise<Result> {
    const { bucket, path, correlationId } = request;
    const { data, error } = await this.db.storage.from(bucket).download(path);
    if (error) {
      return new MediaStorageAccessFailedResponse(correlationId, error.message);
    }
    return new StorageObjectDownloadedResponse(
      correlationId,
      new Uint8Array(await data.arrayBuffer()),
    );
  }
}
