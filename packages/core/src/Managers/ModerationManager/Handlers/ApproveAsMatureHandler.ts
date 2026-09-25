import type { IAuditAccessor } from "../../../Accessors/AuditAccessor/IAuditAccessor";
import type { IModActionAccessor } from "../../../Accessors/ModActionAccessor/IModActionAccessor";
import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import type { INotificationAccessor } from "../../../Accessors/NotificationAccessor/INotificationAccessor";
import { LoadMediaAssetByIdRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { StoreMediaAssetChangesRequest } from "../../../Accessors/MediaAssetAccessor/Requests/StoreMediaAssetChangesRequest";
import { MediaAssetLoadedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetLoadedResponse";
import { MediaAssetNotFoundResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetNotFoundResponse";
import { MediaAssetStoredResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetStoredResponse";
import type { IReportAccessor } from "../../../Accessors/ReportAccessor/IReportAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IMediaPublishEngine } from "../../../Engines/MediaPublishEngine/IMediaPublishEngine";
import { PublishMediaRequest } from "../../../Engines/MediaPublishEngine/Requests/PublishMediaRequest";
import { MediaPublishedResponse } from "../../../Engines/MediaPublishEngine/Responses/MediaPublishedResponse";
import { MediaUnpublishableResponse } from "../../../Engines/MediaPublishEngine/Responses/MediaUnpublishableResponse";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { actorId } from "../actorId";
import { permit } from "../permit";
import { recordModeration } from "../recordModeration";
import type { ApproveAsMatureRequest } from "../Requests/ApproveAsMatureRequest";
import { MatureApprovedResponse } from "../Responses/MatureApprovedResponse";
import type { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import type { ModerationUnavailableResponse } from "../Responses/ModerationUnavailableResponse";
import { NoSuchItemResponse } from "../Responses/NoSuchItemResponse";
import { unavailable } from "../unavailable";

type Result =
  | MatureApprovedResponse
  | NoSuchItemResponse
  | ModerationForbiddenResponse
  | ModerationUnavailableResponse;

// Artistic nudity is approved only with this mandatory tag (SPEC.md §7). The tag goes on
// first, then the image gets its re-encoded public copy (#36) — so the copy never
// exists without the tag that makes every page blur it.
export class ApproveAsMatureHandler implements IHandler<ApproveAsMatureRequest, Result> {
  constructor(
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly modActions: IModActionAccessor,
    private readonly auditLog: IAuditAccessor,
    private readonly reports: IReportAccessor,
    private readonly notifications: INotificationAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly publisher: IMediaPublishEngine,
  ) {}

  async handle(request: ApproveAsMatureRequest): Promise<Result> {
    const { correlationId, actor, mediaId, timestamp } = request;
    const context = { correlationId, timestamp };

    const loaded = await this.mediaAssets.load(
      new LoadMediaAssetByIdRequest(mediaId, context),
    );
    if (loaded instanceof MediaAssetNotFoundResponse) {
      return new NoSuchItemResponse(correlationId);
    }
    if (!(loaded instanceof MediaAssetLoadedResponse)) {
      return unavailable(correlationId, loaded, "mediaAssets.load");
    }

    const refused = await permit(
      this.permissions,
      actor,
      "moderation.act",
      {
        kind: "media",
        id: loaded.asset.id,
        owner: loaded.asset.owner,
        publishedPath: loaded.asset.publishedPath,
        scanStatus: loaded.asset.scanStatus,
      },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    const stored = await this.mediaAssets.store(
      new StoreMediaAssetChangesRequest(mediaId, { mature: true }, context),
    );
    if (!(stored instanceof MediaAssetStoredResponse)) {
      return unavailable(correlationId, stored, "mediaAssets.store");
    }
    // An image that will not decode stays tagged and unpublished; nothing to retry.
    const published = await this.publisher.transform(
      new PublishMediaRequest(stored.asset, undefined, context),
    );
    if (
      !(published instanceof MediaPublishedResponse) &&
      !(published instanceof MediaUnpublishableResponse)
    ) {
      return unavailable(correlationId, published, "publisher.transform");
    }
    const asset =
      published instanceof MediaPublishedResponse ? published.asset : stored.asset;

    const recorded = await recordModeration(
      this.modActions,
      this.auditLog,
      this.reports,
      this.notifications,
      {
        actorId: actorId(actor),
        action: "approve_mature",
        target: { kind: "media", id: mediaId },
        reason: null,
        event: "mod.action",
        auditSubject: { kind: "media", id: mediaId },
        auditDetails: { action: "approve_mature" },
      },
      context,
    );
    if (recorded !== undefined) {
      return recorded;
    }
    return new MatureApprovedResponse(correlationId, asset);
  }
}
