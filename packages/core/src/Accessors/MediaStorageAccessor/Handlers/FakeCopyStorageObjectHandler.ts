import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaStorageState } from "../FakeMediaStorageState";
import type { CopyStorageObjectRequest } from "../Requests/CopyStorageObjectRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectCopiedResponse } from "../Responses/StorageObjectCopiedResponse";

type Result = StorageObjectCopiedResponse | MediaStorageAccessFailedResponse;

export class FakeCopyStorageObjectHandler implements IHandler<
  CopyStorageObjectRequest,
  Result
> {
  constructor(private readonly state: FakeMediaStorageState) {}

  handle(request: CopyStorageObjectRequest): Promise<Result> {
    const { fromBucket, fromPath, toBucket, toPath, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MediaStorageAccessFailedResponse(
          correlationId,
          "MEDIA_STORAGE_FAKE_RESULT=fail",
        ),
      );
    }
    const from = this.state.key(fromBucket, fromPath);
    const bytes = this.state.objects.get(from);
    if (bytes === undefined) {
      return Promise.resolve(
        new MediaStorageAccessFailedResponse(correlationId, `no fake object at ${from}`),
      );
    }
    const to = this.state.key(toBucket, toPath);
    this.state.objects.set(to, bytes);
    const contentType = this.state.contentTypes.get(from);
    if (contentType !== undefined) {
      this.state.contentTypes.set(to, contentType);
    }
    return Promise.resolve(new StorageObjectCopiedResponse(correlationId));
  }
}
