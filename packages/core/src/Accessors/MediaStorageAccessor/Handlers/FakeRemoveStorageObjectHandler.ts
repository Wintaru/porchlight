import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaStorageState } from "../FakeMediaStorageState";
import type { RemoveStorageObjectRequest } from "../Requests/RemoveStorageObjectRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectRemovedResponse } from "../Responses/StorageObjectRemovedResponse";

type Result = StorageObjectRemovedResponse | MediaStorageAccessFailedResponse;

export class FakeRemoveStorageObjectHandler implements IHandler<
  RemoveStorageObjectRequest,
  Result
> {
  constructor(private readonly state: FakeMediaStorageState) {}

  handle(request: RemoveStorageObjectRequest): Promise<Result> {
    const { bucket, path, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MediaStorageAccessFailedResponse(
          correlationId,
          "MEDIA_STORAGE_FAKE_RESULT=fail",
        ),
      );
    }
    this.state.objects.delete(this.state.key(bucket, path));
    return Promise.resolve(new StorageObjectRemovedResponse(correlationId));
  }
}
