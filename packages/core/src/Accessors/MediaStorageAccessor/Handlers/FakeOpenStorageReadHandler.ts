import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaStorageState } from "../FakeMediaStorageState";
import type { OpenStorageReadRequest } from "../Requests/OpenStorageReadRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { StorageReadOpenedResponse } from "../Responses/StorageReadOpenedResponse";
import { issueStorageReadLink } from "../StorageReadLink";

type Result = StorageReadOpenedResponse | MediaStorageAccessFailedResponse;

export class FakeOpenStorageReadHandler implements IHandler<
  OpenStorageReadRequest,
  Result
> {
  constructor(private readonly state: FakeMediaStorageState) {}

  handle(request: OpenStorageReadRequest): Promise<Result> {
    const { bucket, path, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MediaStorageAccessFailedResponse(
          correlationId,
          "MEDIA_STORAGE_FAKE_RESULT=fail",
        ),
      );
    }
    return Promise.resolve(
      new StorageReadOpenedResponse(
        correlationId,
        issueStorageReadLink(bucket, path, `fake://signed-read/${bucket}/${path}`),
      ),
    );
  }
}
