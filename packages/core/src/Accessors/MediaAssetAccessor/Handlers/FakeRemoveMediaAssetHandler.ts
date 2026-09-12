import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaAssetState } from "../FakeMediaAssetState";
import type { RemoveMediaAssetRequest } from "../Requests/RemoveMediaAssetRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaAssetRemovedResponse } from "../Responses/MediaAssetRemovedResponse";
import { MediaAssetRetainedResponse } from "../Responses/MediaAssetRetainedResponse";

type Result =
  MediaAssetRemovedResponse | MediaAssetRetainedResponse | MediaAssetAccessFailedResponse;

export class FakeRemoveMediaAssetHandler implements IHandler<
  RemoveMediaAssetRequest,
  Result
> {
  constructor(private readonly state: FakeMediaAssetState) {}

  handle(request: RemoveMediaAssetRequest): Promise<Result> {
    const { id, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MediaAssetAccessFailedResponse(correlationId, "MEDIA_FAKE_RESULT=fail"),
      );
    }
    const asset = this.state.assets.get(id);
    if (asset?.retainUntil !== null && asset?.retainUntil !== undefined) {
      return Promise.resolve(new MediaAssetRetainedResponse(correlationId));
    }
    this.state.assets.delete(id);
    return Promise.resolve(new MediaAssetRemovedResponse(correlationId));
  }
}
