import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { CreateSignedUploadUrlRequest } from "../Requests/CreateSignedUploadUrlRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { SignedUploadUrlCreatedResponse } from "../Responses/SignedUploadUrlCreatedResponse";

type Result = SignedUploadUrlCreatedResponse | MediaStorageAccessFailedResponse;

export class SupabaseCreateSignedUploadUrlHandler implements IHandler<
  CreateSignedUploadUrlRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: CreateSignedUploadUrlRequest): Promise<Result> {
    const { bucket, path, correlationId } = request;
    const { data, error } = await this.db.storage
      .from(bucket)
      .createSignedUploadUrl(path);
    if (error) {
      return new MediaStorageAccessFailedResponse(correlationId, error.message);
    }
    return new SignedUploadUrlCreatedResponse(correlationId, data.signedUrl);
  }
}
