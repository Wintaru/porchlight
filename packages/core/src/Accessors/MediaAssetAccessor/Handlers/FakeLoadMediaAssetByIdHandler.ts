import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaAssetState } from "../FakeMediaAssetState";
import type { LoadMediaAssetByIdRequest } from "../Requests/LoadMediaAssetByIdRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaAssetLoadedResponse } from "../Responses/MediaAssetLoadedResponse";
import { MediaAssetNotFoundResponse } from "../Responses/MediaAssetNotFoundResponse";

type Result =
  MediaAssetLoadedResponse | MediaAssetNotFoundResponse | MediaAssetAccessFailedResponse;

export class FakeLoadMediaAssetByIdHandler implements IHandler<
  LoadMediaAssetByIdRequest,
  Result
> {
  constructor(private readonly state: FakeMediaAssetState) {}

  handle(request: LoadMediaAssetByIdRequest): Promise<Result> {
    const { id, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MediaAssetAccessFailedResponse(correlationId, "MEDIA_FAKE_RESULT=fail"),
      );
    }
    const asset = this.state.assets.get(id);
    return Promise.resolve(
      asset === undefined
        ? new MediaAssetNotFoundResponse(correlationId, id)
        : new MediaAssetLoadedResponse(correlationId, asset),
    );
  }
}
