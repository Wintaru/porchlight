import type { IMediaAssetAccessor } from "../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { LoadMediaAssetByIdRequest } from "../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { MediaAssetLoadedResponse } from "../../Accessors/MediaAssetAccessor/Responses/MediaAssetLoadedResponse";
import { MediaAssetNotFoundResponse } from "../../Accessors/MediaAssetAccessor/Responses/MediaAssetNotFoundResponse";
import type { RequestContext } from "../../Common/RequestContext";
import type { PostUnavailableResponse } from "./Responses/PostUnavailableResponse";
import { unavailable } from "./unavailable";

// Whether a post's cover is waiting on a moderator (#36): the classifier flagged it and
// nobody has approved it as mature, so it has no published copy yet. Publishing such a
// post sends it to the queue, whoever the author is.
export async function coverAwaitsReview(
  mediaAssets: IMediaAssetAccessor,
  coverMediaId: string | null,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<boolean | PostUnavailableResponse> {
  if (coverMediaId === null) {
    return false;
  }
  const loaded = await mediaAssets.load(
    new LoadMediaAssetByIdRequest(coverMediaId, context),
  );
  if (loaded instanceof MediaAssetNotFoundResponse) {
    return false;
  }
  if (!(loaded instanceof MediaAssetLoadedResponse)) {
    return unavailable(context.correlationId, loaded, "mediaAssets.load");
  }
  return loaded.asset.scanStatus === "flagged" && loaded.asset.publishedPath === null;
}
