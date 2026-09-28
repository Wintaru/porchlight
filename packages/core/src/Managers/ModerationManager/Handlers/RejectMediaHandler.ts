import type { IAuditAccessor } from "../../../Accessors/AuditAccessor/IAuditAccessor";
import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { LoadMediaAssetByIdRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { StoreMediaAssetChangesRequest } from "../../../Accessors/MediaAssetAccessor/Requests/StoreMediaAssetChangesRequest";
import { MediaAssetLoadedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetLoadedResponse";
import { MediaAssetNotFoundResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetNotFoundResponse";
import { MediaAssetStoredResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetStoredResponse";
import type { IModActionAccessor } from "../../../Accessors/ModActionAccessor/IModActionAccessor";
import type { INotificationAccessor } from "../../../Accessors/NotificationAccessor/INotificationAccessor";
import type { IReportAccessor } from "../../../Accessors/ReportAccessor/IReportAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { actorId } from "../actorId";
import { permit } from "../permit";
import { recordModeration } from "../recordModeration";
import type { RejectMediaRequest } from "../Requests/RejectMediaRequest";
import { MediaRejectedByModeratorResponse } from "../Responses/MediaRejectedByModeratorResponse";
import type { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import type { ModerationUnavailableResponse } from "../Responses/ModerationUnavailableResponse";
import { NoSuchItemResponse } from "../Responses/NoSuchItemResponse";
import { ReasonRequiredResponse } from "../Responses/ReasonRequiredResponse";
import { unavailable } from "../unavailable";

type Result =
  | MediaRejectedByModeratorResponse
  | NoSuchItemResponse
  | ModerationForbiddenResponse
  | ReasonRequiredResponse
  | ModerationUnavailableResponse;

// The other answer to a held upload (#90, C13), beside ApproveAsMature. Nothing is
// deleted: the upload stays held as it arrived, so the owner can still remove it and
// free the space, and it can never publish. Only an upload still waiting: a clear one
// needs no decision, nobody decides a locked one (SPEC.md §7), and one already approved
// as mature or turned down has had its answer.
export class RejectMediaHandler implements IHandler<RejectMediaRequest, Result> {
  constructor(
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly modActions: IModActionAccessor,
    private readonly auditLog: IAuditAccessor,
    private readonly reports: IReportAccessor,
    private readonly notifications: INotificationAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: RejectMediaRequest): Promise<Result> {
    const { correlationId, actor, mediaId, timestamp } = request;
    const context = { correlationId, timestamp };
    const reason = request.reason.trim();
    if (reason === "") {
      return new ReasonRequiredResponse(correlationId);
    }

    const loaded = await this.mediaAssets.load(
      new LoadMediaAssetByIdRequest(mediaId, context),
    );
    if (loaded instanceof MediaAssetNotFoundResponse) {
      return new NoSuchItemResponse(correlationId);
    }
    if (!(loaded instanceof MediaAssetLoadedResponse)) {
      return unavailable(correlationId, loaded, "mediaAssets.load");
    }
    const { asset } = loaded;

    const refused = await permit(
      this.permissions,
      actor,
      "moderation.act",
      {
        kind: "media",
        id: asset.id,
        owner: asset.owner,
        publishedPath: asset.publishedPath,
        scanStatus: asset.scanStatus,
      },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    if (
      asset.scanStatus !== "flagged" ||
      asset.mature ||
      asset.publishedPath !== null ||
      asset.rejectedAt !== null
    ) {
      return new NoSuchItemResponse(correlationId);
    }

    const stored = await this.mediaAssets.store(
      new StoreMediaAssetChangesRequest(mediaId, { rejectedAt: timestamp }, context),
    );
    if (!(stored instanceof MediaAssetStoredResponse)) {
      return unavailable(correlationId, stored, "mediaAssets.store");
    }

    const recorded = await recordModeration(
      this.modActions,
      this.auditLog,
      this.reports,
      this.notifications,
      {
        actorId: actorId(actor),
        action: "reject",
        target: { kind: "media", id: mediaId },
        reason,
        event: "mod.action",
        auditSubject: { kind: "media", id: mediaId },
        auditDetails: { action: "reject_media" },
        notify:
          asset.owner.kind === "member"
            ? [
                {
                  recipientId: asset.owner.profileId,
                  kind: "mod.action",
                  payload: { action: "reject_media", mediaId, reason },
                },
              ]
            : [],
      },
      context,
    );
    if (recorded !== undefined) {
      return recorded;
    }
    return new MediaRejectedByModeratorResponse(correlationId, stored.asset);
  }
}
