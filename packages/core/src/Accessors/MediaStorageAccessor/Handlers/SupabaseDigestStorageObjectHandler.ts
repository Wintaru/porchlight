import { createHash } from "node:crypto";

import type { IHandler } from "../../../Common/IHandler";
import type { DigestStorageObjectRequest } from "../Requests/DigestStorageObjectRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectDigestResponse } from "../Responses/StorageObjectDigestResponse";

type Result = StorageObjectDigestResponse | MediaStorageAccessFailedResponse;

// Streams the object through the hash one chunk at a time. The storage client would
// buffer the whole object, so the read goes through the check's one signed link (#95).
export class SupabaseDigestStorageObjectHandler implements IHandler<
  DigestStorageObjectRequest,
  Result
> {
  async handle(request: DigestStorageObjectRequest): Promise<Result> {
    const { link, correlationId } = request;
    const { bucket, path } = link;
    try {
      const response = await fetch(link.url);
      if (!response.ok || response.body === null) {
        await response.body?.cancel();
        return new MediaStorageAccessFailedResponse(
          correlationId,
          `read of ${bucket}/${path} answered ${String(response.status)}`,
        );
      }
      const hash = createHash("sha256");
      let bytes = 0;
      for await (const chunk of response.body) {
        hash.update(chunk);
        bytes += chunk.byteLength;
      }
      return new StorageObjectDigestResponse(correlationId, hash.digest("hex"), bytes);
    } catch (caught: unknown) {
      const reason = caught instanceof Error ? caught.message : String(caught);
      return new MediaStorageAccessFailedResponse(correlationId, reason);
    }
  }
}
