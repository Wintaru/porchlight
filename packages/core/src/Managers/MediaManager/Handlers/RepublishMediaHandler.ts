import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { LoadMediaAssetByIdRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { MediaAssetLoadedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetLoadedResponse";
import { MediaAssetNotFoundResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetNotFoundResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IMediaPublishEngine } from "../../../Engines/MediaPublishEngine/IMediaPublishEngine";
import { PublishMediaRequest } from "../../../Engines/MediaPublishEngine/Requests/PublishMediaRequest";
import { MediaPublishedResponse } from "../../../Engines/MediaPublishEngine/Responses/MediaPublishedResponse";
import { MediaUnpublishableResponse } from "../../../Engines/MediaPublishEngine/Responses/MediaUnpublishableResponse";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import type { RepublishMediaRequest } from "../Requests/RepublishMediaRequest";
import type { MediaForbiddenResponse } from "../Responses/MediaForbiddenResponse";
import { MediaRepublishedResponse } from "../Responses/MediaRepublishedResponse";
import type { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { NoSuchMediaResponse } from "../Responses/NoSuchMediaResponse";
import { unavailable } from "../unavailable";

type Result =
  | MediaRepublishedResponse
  | NoSuchMediaResponse
  | MediaForbiddenResponse
  | MediaUnavailableResponse;

// The owner's "try again" for a missing public copy (#36). The same people who may
// delete an upload may retry it; the engine decides whether it may be published at all.
export class RepublishMediaHandler implements IHandler<RepublishMediaRequest, Result> {
  constructor(
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly publisher: IMediaPublishEngine,
  ) {}

  async handle(request: RepublishMediaRequest): Promise<Result> {
    const { correlationId, actor, mediaId, timestamp } = request;
    const context = { correlationId, timestamp };

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
    const refused = await permit(
      this.permissions,
      actor,
      "media.delete",
      {
        kind: "media",
        id: mediaId,
        owner: asset.owner,
        publishedPath: asset.publishedPath,
        scanStatus: asset.scanStatus,
      },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    const published = await this.publisher.transform(
      new PublishMediaRequest(asset, undefined, context),
    );
    if (published instanceof MediaPublishedResponse) {
      return new MediaRepublishedResponse(correlationId, published.asset, null);
    }
    if (published instanceof MediaUnpublishableResponse) {
      return new MediaRepublishedResponse(correlationId, asset, published.reason);
    }
    return unavailable(correlationId, published, "publisher.transform");
  }
}
