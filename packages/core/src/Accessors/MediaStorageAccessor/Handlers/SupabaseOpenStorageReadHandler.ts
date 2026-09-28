import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { OpenStorageReadRequest } from "../Requests/OpenStorageReadRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageReadOpenedResponse } from "../Responses/StorageReadOpenedResponse";
import { issueStorageReadLink } from "../StorageReadLink";

type Result = StorageReadOpenedResponse | MediaStorageAccessFailedResponse;

// Long enough for a video check to finish its range reads, its quota check, and to
// start the streamed hash. Storage checks the signature when a read starts, so a hash
// that is still streaming when the link expires runs to its end.
const SIGNED_URL_TTL_SECONDS = 600;

// The storage client reads whole objects only, so a part read goes through a signed URL.
export class SupabaseOpenStorageReadHandler implements IHandler<
  OpenStorageReadRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: OpenStorageReadRequest): Promise<Result> {
    const { bucket, path, correlationId } = request;
    const { data, error } = await this.db.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error) {
      return new MediaStorageAccessFailedResponse(correlationId, error.message);
    }
    return new StorageReadOpenedResponse(
      correlationId,
      issueStorageReadLink(bucket, path, data.signedUrl),
    );
  }
}
