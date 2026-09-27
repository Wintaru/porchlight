import type { IHandler } from "../../../Common/IHandler";
import type { FakeMediaAssetState } from "../FakeMediaAssetState";
import type { LoadUnusedMediaRequest } from "../Requests/LoadUnusedMediaRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { UnusedMediaLoadedResponse } from "../Responses/UnusedMediaLoadedResponse";

type Result = UnusedMediaLoadedResponse | MediaAssetAccessFailedResponse;

// The fake holds no posts, so a test names the uploads some post still uses in
// `usedMediaIds`.
export class FakeLoadUnusedMediaHandler implements IHandler<
  LoadUnusedMediaRequest,
  Result
> {
  constructor(private readonly state: FakeMediaAssetState) {}

  handle(request: LoadUnusedMediaRequest): Promise<Result> {
    if (this.state.failing) {
      return Promise.resolve(
        new MediaAssetAccessFailedResponse(
          request.correlationId,
          "MEDIA_FAKE_RESULT=fail",
        ),
      );
    }
    const mediaIds = request.mediaIds.filter((id) => {
      const asset = this.state.assets.get(id);
      return (
        asset?.owner.kind === "member" &&
        asset.owner.profileId === request.ownerId &&
        !this.state.usedMediaIds.has(id)
      );
    });
    return Promise.resolve(
      new UnusedMediaLoadedResponse(request.correlationId, mediaIds),
    );
  }
}
