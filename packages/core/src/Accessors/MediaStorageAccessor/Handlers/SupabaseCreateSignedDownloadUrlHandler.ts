import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { CreateSignedDownloadUrlRequest } from "../Requests/CreateSignedDownloadUrlRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { SignedDownloadUrlCreatedResponse } from "../Responses/SignedDownloadUrlCreatedResponse";

type Result = SignedDownloadUrlCreatedResponse | MediaStorageAccessFailedResponse;

// One hour: long enough to load a preview or start a download after a page render,
// short enough that a copied link goes stale instead of outliving a later deletion.
const SIGNED_URL_TTL_SECONDS = 3600;

export class SupabaseCreateSignedDownloadUrlHandler implements IHandler<
  CreateSignedDownloadUrlRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: CreateSignedDownloadUrlRequest): Promise<Result> {
    const { bucket, path, forceDownload, correlationId } = request;
    const { data, error } = await this.db.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, { download: forceDownload });
    if (error) {
      return new MediaStorageAccessFailedResponse(correlationId, error.message);
    }
    return new SignedDownloadUrlCreatedResponse(correlationId, data.signedUrl);
  }
}
