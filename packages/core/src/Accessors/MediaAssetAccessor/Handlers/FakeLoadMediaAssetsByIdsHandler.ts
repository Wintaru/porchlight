import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaAssetState } from "../FakeMediaAssetState";
import type { LoadMediaAssetsByIdsRequest } from "../Requests/LoadMediaAssetsByIdsRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaAssetsLoadedResponse } from "../Responses/MediaAssetsLoadedResponse";

type Result = MediaAssetsLoadedResponse | MediaAssetAccessFailedResponse;

export class FakeLoadMediaAssetsByIdsHandler implements IHandler<
  LoadMediaAssetsByIdsRequest,
  Result
> {
  constructor(private readonly state: FakeMediaAssetState) {}

  handle(request: LoadMediaAssetsByIdsRequest): Promise<Result> {
    const { ids, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MediaAssetAccessFailedResponse(correlationId, "MEDIA_FAKE_RESULT=fail"),
      );
    }
    const assets = [...new Set(ids)].flatMap((id) => this.state.assets.get(id) ?? []);
    return Promise.resolve(new MediaAssetsLoadedResponse(correlationId, assets));
  }
}
