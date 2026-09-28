import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaStorageState } from "../FakeMediaStorageState";
import type { DownloadStorageObjectRangeRequest } from "../Requests/DownloadStorageObjectRangeRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageObjectDownloadedResponse } from "../Responses/StorageObjectDownloadedResponse";

type Result = StorageObjectDownloadedResponse | MediaStorageAccessFailedResponse;

export class FakeDownloadStorageObjectRangeHandler implements IHandler<
  DownloadStorageObjectRangeRequest,
  Result
> {
  constructor(private readonly state: FakeMediaStorageState) {}

  handle(request: DownloadStorageObjectRangeRequest): Promise<Result> {
    const { link, offset, length, correlationId } = request;
    const { bucket, path } = link;
    if (this.state.failing) {
      return Promise.resolve(
        new MediaStorageAccessFailedResponse(
          correlationId,
          "MEDIA_STORAGE_FAKE_RESULT=fail",
        ),
      );
    }
    const bytes = this.state.objects.get(this.state.key(bucket, path));
    if (bytes === undefined || offset >= bytes.length) {
      return Promise.resolve(
        new MediaStorageAccessFailedResponse(
          correlationId,
          `no fake bytes at ${bucket}/${path} from ${String(offset)}`,
        ),
      );
    }
    return Promise.resolve(
      new StorageObjectDownloadedResponse(
        correlationId,
        bytes.slice(offset, offset + length),
      ),
    );
  }
}
