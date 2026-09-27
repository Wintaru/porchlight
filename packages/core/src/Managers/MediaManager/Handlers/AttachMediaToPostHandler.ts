import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { LoadMediaAssetByIdRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { StoreMediaAssetChangesRequest } from "../../../Accessors/MediaAssetAccessor/Requests/StoreMediaAssetChangesRequest";
import { MediaAssetLoadedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetLoadedResponse";
import { MediaAssetNotFoundResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetNotFoundResponse";
import { MediaAssetStoredResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { AttachMediaToPostRequest } from "../Requests/AttachMediaToPostRequest";
import { MediaForbiddenResponse } from "../Responses/MediaForbiddenResponse";
import { MediaAttachedResponse } from "../Responses/MediaAttachedResponse";
import type { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { NoSuchMediaResponse } from "../Responses/NoSuchMediaResponse";
import { unavailable } from "../unavailable";

type Result =
  | MediaAttachedResponse
  | NoSuchMediaResponse
  | MediaForbiddenResponse
  | MediaUnavailableResponse;

// Only the uploader attaches, and only to a post of their own: the database refuses a
// post of another owner (`media_assets_post_owner_guard`). An upload that already
// belongs to a post stays with it.
export class AttachMediaToPostHandler implements IHandler<
  AttachMediaToPostRequest,
  Result
> {
  constructor(private readonly mediaAssets: IMediaAssetAccessor) {}

  async handle(request: AttachMediaToPostRequest): Promise<Result> {
    const { correlationId, actor, mediaId, postId } = request;
    const context = { correlationId };
    if (actor.kind !== "member") {
      return new MediaForbiddenResponse(correlationId, "signed-out");
    }

    const loaded = await this.mediaAssets.load(
      new LoadMediaAssetByIdRequest(mediaId, context),
    );
    if (loaded instanceof MediaAssetNotFoundResponse) {
      return new NoSuchMediaResponse(correlationId, mediaId);
    }
    if (!(loaded instanceof MediaAssetLoadedResponse)) {
      return unavailable(correlationId, loaded, "mediaAssets.load");
    }
    const { asset } = loaded;
    if (asset.owner.kind !== "member" || asset.owner.profileId !== actor.profile.id) {
      return new MediaForbiddenResponse(correlationId, "not-allowed");
    }
    if (asset.postId !== null) {
      return new MediaAttachedResponse(correlationId, asset);
    }

    const stored = await this.mediaAssets.store(
      new StoreMediaAssetChangesRequest(mediaId, { postId }, context),
    );
    // A save linked it to a post between the load and the store: that post keeps it.
    if (stored instanceof MediaAssetNotFoundResponse) {
      return new MediaAttachedResponse(correlationId, asset);
    }
    if (!(stored instanceof MediaAssetStoredResponse)) {
      return unavailable(correlationId, stored, "mediaAssets.store");
    }
    return new MediaAttachedResponse(correlationId, stored.asset);
  }
}
