import type { IMediaAssetAccessor } from "../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { LoadMediaAssetByIdRequest } from "../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { MediaAssetLoadedResponse } from "../../Accessors/MediaAssetAccessor/Responses/MediaAssetLoadedResponse";
import { MediaAssetNotFoundResponse } from "../../Accessors/MediaAssetAccessor/Responses/MediaAssetNotFoundResponse";
import type { RequestContext } from "../../Common/RequestContext";
import { PostRejectedResponse } from "./Responses/PostRejectedResponse";
import type { PostUnavailableResponse } from "./Responses/PostUnavailableResponse";
import { unavailable } from "./unavailable";

// A cover is the author's own image, and never one a scan locked or has not scanned
// (#52). A flagged one is allowed: it shows once a moderator approves it as mature, and
// publishing the post sends it to the queue until then.
export async function checkCover(
  mediaAssets: IMediaAssetAccessor,
  authorId: string,
  mediaId: string | null | undefined,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<PostRejectedResponse | PostUnavailableResponse | undefined> {
  if (mediaId === null || mediaId === undefined) {
    return undefined;
  }
  const loaded = await mediaAssets.load(new LoadMediaAssetByIdRequest(mediaId, context));
  if (loaded instanceof MediaAssetNotFoundResponse) {
    return new PostRejectedResponse(context.correlationId, "cover");
  }
  if (!(loaded instanceof MediaAssetLoadedResponse)) {
    return unavailable(context.correlationId, loaded, "mediaAssets.load");
  }
  const { asset } = loaded;
  const usable =
    asset.kind === "image" &&
    asset.owner.kind === "member" &&
    asset.owner.profileId === authorId &&
    (asset.scanStatus === "clear" || asset.scanStatus === "flagged");
  return usable ? undefined : new PostRejectedResponse(context.correlationId, "cover");
}
