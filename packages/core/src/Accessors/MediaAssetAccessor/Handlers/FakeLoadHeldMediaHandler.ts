import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaAssetState } from "../FakeMediaAssetState";
import type { LoadHeldMediaRequest } from "../Requests/LoadHeldMediaRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaAssetsLoadedResponse } from "../Responses/MediaAssetsLoadedResponse";

type Result = MediaAssetsLoadedResponse | MediaAssetAccessFailedResponse;

export class FakeLoadHeldMediaHandler implements IHandler<LoadHeldMediaRequest, Result> {
  constructor(private readonly state: FakeMediaAssetState) {}

  handle(request: LoadHeldMediaRequest): Promise<Result> {
    if (this.state.failing) {
      return Promise.resolve(
        new MediaAssetAccessFailedResponse(
          request.correlationId,
          "MEDIA_FAKE_RESULT=fail",
        ),
      );
    }
    const held = [...this.state.assets.values()]
      .filter(
        (asset) =>
          asset.scanStatus === "flagged" && !asset.mature && asset.rejectedAt === null,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, request.limit);
    return Promise.resolve(new MediaAssetsLoadedResponse(request.correlationId, held));
  }
}
