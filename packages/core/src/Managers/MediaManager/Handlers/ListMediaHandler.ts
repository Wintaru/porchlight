import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { LoadMediaAssetsByOwnerRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetsByOwnerRequest";
import { MediaAssetsLoadedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetsLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { ListMediaRequest } from "../Requests/ListMediaRequest";
import { MediaForbiddenResponse } from "../Responses/MediaForbiddenResponse";
import { MediaListResponse } from "../Responses/MediaListResponse";
import type { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { unavailable } from "../unavailable";

type Result = MediaListResponse | MediaForbiddenResponse | MediaUnavailableResponse;

// Only ever the caller's own uploads, so there is no subject to check: a visitor has
// none, and a member sees exactly what they uploaded. A locked upload is left out —
// nobody views one (SPEC.md §7).
export class ListMediaHandler implements IHandler<ListMediaRequest, Result> {
  constructor(private readonly mediaAssets: IMediaAssetAccessor) {}

  async handle(request: ListMediaRequest): Promise<Result> {
    const { correlationId, actor, postId } = request;
    if (actor.kind !== "member") {
      return new MediaForbiddenResponse(correlationId, "signed-out");
    }
    const loaded = await this.mediaAssets.load(
      new LoadMediaAssetsByOwnerRequest(
        actor.profile.id,
        { correlationId },
        { postId, excludeLocked: true },
      ),
    );
    if (!(loaded instanceof MediaAssetsLoadedResponse)) {
      return unavailable(correlationId, loaded, "mediaAssets.load");
    }
    return new MediaListResponse(correlationId, loaded.assets);
  }
}
