import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaStorageState } from "../FakeMediaStorageState";
import type { LoadStorageObjectInfoRequest } from "../Requests/LoadStorageObjectInfoRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectInfoResponse } from "../Responses/StorageObjectInfoResponse";

type Result = StorageObjectInfoResponse | MediaStorageAccessFailedResponse;

export class FakeLoadStorageObjectInfoHandler implements IHandler<
  LoadStorageObjectInfoRequest,
  Result
> {
  constructor(private readonly state: FakeMediaStorageState) {}

  handle(request: LoadStorageObjectInfoRequest): Promise<Result> {
    const { bucket, path, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MediaStorageAccessFailedResponse(
          correlationId,
          "MEDIA_STORAGE_FAKE_RESULT=fail",
        ),
      );
    }
    const key = this.state.key(bucket, path);
    const bytes = this.state.objects.get(key);
    if (bytes === undefined) {
      return Promise.resolve(
        new MediaStorageAccessFailedResponse(correlationId, `no fake object at ${key}`),
      );
    }
    return Promise.resolve(
      new StorageObjectInfoResponse(
        correlationId,
        bytes.length,
        this.state.contentTypes.get(key) ?? "application/octet-stream",
      ),
    );
  }
}
