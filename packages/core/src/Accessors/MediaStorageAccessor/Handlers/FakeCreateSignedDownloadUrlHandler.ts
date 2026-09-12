import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaStorageState } from "../FakeMediaStorageState";
import type { CreateSignedDownloadUrlRequest } from "../Requests/CreateSignedDownloadUrlRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { SignedDownloadUrlCreatedResponse } from "../Responses/SignedDownloadUrlCreatedResponse";

type Result = SignedDownloadUrlCreatedResponse | MediaStorageAccessFailedResponse;

export class FakeCreateSignedDownloadUrlHandler implements IHandler<
  CreateSignedDownloadUrlRequest,
  Result
> {
  constructor(private readonly state: FakeMediaStorageState) {}

  handle(request: CreateSignedDownloadUrlRequest): Promise<Result> {
    const { path, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MediaStorageAccessFailedResponse(
          correlationId,
          "MEDIA_STORAGE_FAKE_RESULT=fail",
        ),
      );
    }
    return Promise.resolve(
      new SignedDownloadUrlCreatedResponse(
        correlationId,
        `fake://signed-download/${path}`,
      ),
    );
  }
}
