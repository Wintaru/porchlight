import type { IAnonymousAuthorAccessor } from "../../../Accessors/AnonymousAuthorAccessor/IAnonymousAuthorAccessor";
import { LoadAnonymousAuthorIpHashRequest } from "../../../Accessors/AnonymousAuthorAccessor/Requests/LoadAnonymousAuthorIpHashRequest";
import { AnonymousAuthorIpHashLoadedResponse } from "../../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorIpHashLoadedResponse";
import type { IAuditAccessor } from "../../../Accessors/AuditAccessor/IAuditAccessor";
import type { IBlockAccessor } from "../../../Accessors/BlockAccessor/IBlockAccessor";
import { CreateBlockRequest } from "../../../Accessors/BlockAccessor/Requests/CreateBlockRequest";
import { BlockCreatedResponse } from "../../../Accessors/BlockAccessor/Responses/BlockCreatedResponse";
import type { IModActionAccessor } from "../../../Accessors/ModActionAccessor/IModActionAccessor";
import type { INotificationAccessor } from "../../../Accessors/NotificationAccessor/INotificationAccessor";
import type { IReportAccessor } from "../../../Accessors/ReportAccessor/IReportAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { actorId } from "../actorId";
import { permit } from "../permit";
import { recordModeration } from "../recordModeration";
import type { BlockAnonymousRequest } from "../Requests/BlockAnonymousRequest";
import { AnonymousAuthorBlockedResponse } from "../Responses/AnonymousAuthorBlockedResponse";
import type { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import type { ModerationUnavailableResponse } from "../Responses/ModerationUnavailableResponse";
import { unavailable } from "../unavailable";

type Result =
  | AnonymousAuthorBlockedResponse
  | ModerationForbiddenResponse
  | ModerationUnavailableResponse;

// One-click admin block by anonymous token and the address it last wrote from (D15,
// #37). An unknown token surfaces as ModerationUnavailableResponse from the address
// lookup, the same way the `blocks.anonymous_author_id` foreign key would refuse it.
export class BlockAnonymousHandler implements IHandler<BlockAnonymousRequest, Result> {
  constructor(
    private readonly blocks: IBlockAccessor,
    private readonly anonymousAuthors: IAnonymousAuthorAccessor,
    private readonly modActions: IModActionAccessor,
    private readonly auditLog: IAuditAccessor,
    private readonly reports: IReportAccessor,
    private readonly notifications: INotificationAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: BlockAnonymousRequest): Promise<Result> {
    const { correlationId, actor, anonymousAuthorId, reason, timestamp } = request;
    const context = { correlationId, timestamp };

    const refused = await permit(
      this.permissions,
      actor,
      "anonymous.moderate",
      { kind: "anonymousAuthor", id: anonymousAuthorId },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    // The address goes on the block too (SPEC.md §7: token and IP hash), so a fresh
    // cookie from the same place is still refused (#37).
    const address = await this.anonymousAuthors.load(
      new LoadAnonymousAuthorIpHashRequest(anonymousAuthorId, context),
    );
    if (!(address instanceof AnonymousAuthorIpHashLoadedResponse)) {
      return unavailable(correlationId, address, "anonymousAuthors.load");
    }
    const created = await this.blocks.store(
      new CreateBlockRequest(
        anonymousAuthorId,
        address.ipHash,
        reason,
        actorId(actor),
        context,
      ),
    );
    if (!(created instanceof BlockCreatedResponse)) {
      return unavailable(correlationId, created, "blocks.store");
    }

    const recorded = await recordModeration(
      this.modActions,
      this.auditLog,
      this.reports,
      this.notifications,
      {
        actorId: actorId(actor),
        action: "block_anonymous",
        target: { kind: "anonymousAuthor", id: anonymousAuthorId },
        reason,
        event: "mod.action",
        auditDetails: { action: "block_anonymous", anonymousAuthorId, reason },
      },
      context,
    );
    if (recorded !== undefined) {
      return recorded;
    }
    return new AnonymousAuthorBlockedResponse(correlationId, created.blockId);
  }
}
