import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaStorageState } from "../FakeMediaStorageState";
import type { RemoveStorageObjectsRequest } from "../Requests/RemoveStorageObjectsRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectRemovedResponse } from "../Responses/StorageObjectRemovedResponse";

type Result = StorageObjectRemovedResponse | MediaStorageAccessFailedResponse;

export class FakeRemoveStorageObjectsHandler implements IHandler<
  RemoveStorageObjectsRequest,
  Result
> {
  constructor(private readonly state: FakeMediaStorageState) {}

  handle(request: RemoveStorageObjectsRequest): Promise<Result> {
    const { bucket, paths, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MediaStorageAccessFailedResponse(
          correlationId,
          "MEDIA_STORAGE_FAKE_RESULT=fail",
        ),
      );
    }
    for (const path of paths) {
      this.state.objects.delete(this.state.key(bucket, path));
    }
    return Promise.resolve(new StorageObjectRemovedResponse(correlationId));
  }
}
