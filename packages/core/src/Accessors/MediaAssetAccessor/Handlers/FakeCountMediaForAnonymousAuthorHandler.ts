import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaAssetState } from "../FakeMediaAssetState";
import type { CountMediaForAnonymousAuthorRequest } from "../Requests/CountMediaForAnonymousAuthorRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaCountResponse } from "../Responses/MediaCountResponse";

export class FakeCountMediaForAnonymousAuthorHandler implements IHandler<
  CountMediaForAnonymousAuthorRequest,
  MediaCountResponse | MediaAssetAccessFailedResponse
> {
  constructor(private readonly state: FakeMediaAssetState) {}

  handle(
    request: CountMediaForAnonymousAuthorRequest,
  ): Promise<MediaCountResponse | MediaAssetAccessFailedResponse> {
    const { anonymousAuthorId, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MediaAssetAccessFailedResponse(correlationId, "MEDIA_FAKE_RESULT=fail"),
      );
    }
    return Promise.resolve(
      new MediaCountResponse(
        correlationId,
        this.state.countForAnonymousAuthor(anonymousAuthorId),
      ),
    );
  }
}
