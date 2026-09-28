import type { IHandler } from "../../../Common/IHandler";
import type { DownloadStorageObjectRangeRequest } from "../Requests/DownloadStorageObjectRangeRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectDownloadedResponse } from "../Responses/StorageObjectDownloadedResponse";

type Result = StorageObjectDownloadedResponse | MediaStorageAccessFailedResponse;

const PARTIAL_CONTENT = 206;

// An HTTP Range read through the check's one signed link (#95): no signing of its own.
export class SupabaseDownloadStorageObjectRangeHandler implements IHandler<
  DownloadStorageObjectRangeRequest,
  Result
> {
  async handle(request: DownloadStorageObjectRangeRequest): Promise<Result> {
    const { link, offset, length, correlationId } = request;
    const { bucket, path } = link;
    try {
      const response = await fetch(link.url, {
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
