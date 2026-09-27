import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaStorageState } from "../FakeMediaStorageState";
import type { UploadStorageObjectRequest } from "../Requests/UploadStorageObjectRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectUploadedResponse } from "../Responses/StorageObjectUploadedResponse";

type Result = StorageObjectUploadedResponse | MediaStorageAccessFailedResponse;

export class FakeUploadStorageObjectHandler implements IHandler<
  UploadStorageObjectRequest,
  Result
> {
  constructor(private readonly state: FakeMediaStorageState) {}

  handle(request: UploadStorageObjectRequest): Promise<Result> {
    const { bucket, path, bytes, contentType, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MediaStorageAccessFailedResponse(
          correlationId,
          "MEDIA_STORAGE_FAKE_RESULT=fail",
        ),
      );
    }
    const key = this.state.key(bucket, path);
    this.state.objects.set(key, bytes);
    this.state.contentTypes.set(key, contentType);
    return Promise.resolve(new StorageObjectUploadedResponse(correlationId));
  }
}
