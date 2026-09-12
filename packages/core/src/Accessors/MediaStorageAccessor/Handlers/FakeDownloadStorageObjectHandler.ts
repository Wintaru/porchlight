import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaStorageState } from "../FakeMediaStorageState";
import type { DownloadStorageObjectRequest } from "../Requests/DownloadStorageObjectRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectDownloadedResponse } from "../Responses/StorageObjectDownloadedResponse";

type Result = StorageObjectDownloadedResponse | MediaStorageAccessFailedResponse;

export class FakeDownloadStorageObjectHandler implements IHandler<
  DownloadStorageObjectRequest,
  Result
> {
  constructor(private readonly state: FakeMediaStorageState) {}

  handle(request: DownloadStorageObjectRequest): Promise<Result> {
    const { bucket, path, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MediaStorageAccessFailedResponse(
          correlationId,
          "MEDIA_STORAGE_FAKE_RESULT=fail",
        ),
      );
    }
    const bytes = this.state.objects.get(this.state.key(bucket, path));
    if (bytes === undefined) {
      return Promise.resolve(
        new MediaStorageAccessFailedResponse(
          correlationId,
          `no fake object at ${bucket}/${path}`,
        ),
      );
    }
    return Promise.resolve(new StorageObjectDownloadedResponse(correlationId, bytes));
  }
}
