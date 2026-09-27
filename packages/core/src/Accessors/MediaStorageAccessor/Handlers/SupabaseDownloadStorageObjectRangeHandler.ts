import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { DownloadStorageObjectRangeRequest } from "../Requests/DownloadStorageObjectRangeRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectDownloadedResponse } from "../Responses/StorageObjectDownloadedResponse";

type Result = StorageObjectDownloadedResponse | MediaStorageAccessFailedResponse;

// Long enough for one read to start.
const SIGNED_URL_TTL_SECONDS = 60;
const PARTIAL_CONTENT = 206;

// The storage client reads whole objects only, so a range goes through a short-lived
// signed URL with an HTTP Range header.
export class SupabaseDownloadStorageObjectRangeHandler implements IHandler<
  DownloadStorageObjectRangeRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: DownloadStorageObjectRangeRequest): Promise<Result> {
    const { bucket, path, offset, length, correlationId } = request;
    const { data, error } = await this.db.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error) {
      return new MediaStorageAccessFailedResponse(correlationId, error.message);
    }
    try {
      const response = await fetch(data.signedUrl, {
        headers: { range: `bytes=${String(offset)}-${String(offset + length - 1)}` },
      });
      // 200 means the server ignored the range and sent everything: refuse it rather
      // than read an object of unknown size into memory.
      if (response.status !== PARTIAL_CONTENT) {
        await response.body?.cancel();
        return new MediaStorageAccessFailedResponse(
          correlationId,
          `range read of ${bucket}/${path} answered ${String(response.status)}`,
        );
      }
      return new StorageObjectDownloadedResponse(
        correlationId,
        new Uint8Array(await response.arrayBuffer()),
      );
    } catch (caught: unknown) {
      const reason = caught instanceof Error ? caught.message : String(caught);
      return new MediaStorageAccessFailedResponse(correlationId, reason);
    }
  }
}
