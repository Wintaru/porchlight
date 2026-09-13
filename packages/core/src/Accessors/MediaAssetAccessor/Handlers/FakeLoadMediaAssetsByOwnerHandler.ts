import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaAssetState } from "../FakeMediaAssetState";
import type { LoadMediaAssetsByOwnerRequest } from "../Requests/LoadMediaAssetsByOwnerRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaAssetsLoadedResponse } from "../Responses/MediaAssetsLoadedResponse";

type Result = MediaAssetsLoadedResponse | MediaAssetAccessFailedResponse;

export class FakeLoadMediaAssetsByOwnerHandler implements IHandler<
  LoadMediaAssetsByOwnerRequest,
  Result
> {
  constructor(private readonly state: FakeMediaAssetState) {}

  handle(request: LoadMediaAssetsByOwnerRequest): Promise<Result> {
    if (this.state.failing) {
      return Promise.resolve(
        new MediaAssetAccessFailedResponse(
          request.correlationId,
          "MEDIA_FAKE_RESULT=fail",
        ),
      );
    }
    const assets = [...this.state.assets.values()]
      .filter(
        (asset) =>
          asset.owner.kind === "member" && asset.owner.profileId === request.profileId,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Promise.resolve(new MediaAssetsLoadedResponse(request.correlationId, assets));
  }
}
