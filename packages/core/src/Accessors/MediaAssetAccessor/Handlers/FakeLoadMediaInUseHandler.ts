import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaAssetState } from "../FakeMediaAssetState";
import type { LoadMediaInUseRequest } from "../Requests/LoadMediaInUseRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaInUseLoadedResponse } from "../Responses/MediaInUseLoadedResponse";

type Result = MediaInUseLoadedResponse | MediaAssetAccessFailedResponse;

// The fake holds no posts or comments: `usedMediaIds` names the uploads one shows.
export class FakeLoadMediaInUseHandler implements IHandler<
  LoadMediaInUseRequest,
  Result
> {
  constructor(private readonly state: FakeMediaAssetState) {}

  handle(request: LoadMediaInUseRequest): Promise<Result> {
    if (this.state.failing) {
      return Promise.resolve(
        new MediaAssetAccessFailedResponse(
          request.correlationId,
          "MEDIA_FAKE_RESULT=fail",
        ),
      );
    }
    return Promise.resolve(
      new MediaInUseLoadedResponse(
        request.correlationId,
        this.state.usedMediaIds.has(request.mediaId),
      ),
    );
  }
}
