import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaStorageState } from "../FakeMediaStorageState";
import type { CreateSignedUploadUrlRequest } from "../Requests/CreateSignedUploadUrlRequest";
import { MediaStorageAccessFailedResponse } from "../Responses/MediaStorageAccessFailedResponse";
import { SignedUploadUrlCreatedResponse } from "../Responses/SignedUploadUrlCreatedResponse";

type Result = SignedUploadUrlCreatedResponse | MediaStorageAccessFailedResponse;

// Nothing ever PUTs to this URL under the fake: a test that exercises FinalizeUpload
// seeds `state.objects` directly instead, the same way a fake accessor's tests seed its
// own map elsewhere in this codebase.
export class FakeCreateSignedUploadUrlHandler implements IHandler<
  CreateSignedUploadUrlRequest,
  Result
> {
  constructor(private readonly state: FakeMediaStorageState) {}

  handle(request: CreateSignedUploadUrlRequest): Promise<Result> {
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
      new SignedUploadUrlCreatedResponse(
        correlationId,
        `fake://signed-upload/${path}?token=fake`,
      ),
    );
  }
}
