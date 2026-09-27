import { createHash } from "node:crypto";

import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { DigestStorageObjectRequest } from "../Requests/DigestStorageObjectRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectDigestResponse } from "../Responses/StorageObjectDigestResponse";

type Result = StorageObjectDigestResponse | MediaStorageAccessFailedResponse;

// Long enough to read a capped video end to end.
const SIGNED_URL_TTL_SECONDS = 600;

// Streams the object through the hash one chunk at a time. The storage client would
// buffer the whole object, so the read goes through a short-lived signed URL.
export class SupabaseDigestStorageObjectHandler implements IHandler<
  DigestStorageObjectRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: DigestStorageObjectRequest): Promise<Result> {
    const { bucket, path, correlationId } = request;
    const { data, error } = await this.db.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error) {
      return new MediaStorageAccessFailedResponse(correlationId, error.message);
    }
    try {
      const response = await fetch(data.signedUrl);
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
