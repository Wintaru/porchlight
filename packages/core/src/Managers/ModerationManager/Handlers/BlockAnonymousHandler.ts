import type { IAuditAccessor } from "../../../Accessors/AuditAccessor/IAuditAccessor";
import type { IBlockAccessor } from "../../../Accessors/BlockAccessor/IBlockAccessor";
import { CreateBlockRequest } from "../../../Accessors/BlockAccessor/Requests/CreateBlockRequest";
import { BlockCreatedResponse } from "../../../Accessors/BlockAccessor/Responses/BlockCreatedResponse";
import type { IModActionAccessor } from "../../../Accessors/ModActionAccessor/IModActionAccessor";
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

// One-click admin block by anonymous token (D15). An unknown token surfaces as
// ModerationUnavailableResponse through the `blocks.anonymous_author_id` foreign key
// rather than a dedicated existence check — the schema already enforces it.
export class BlockAnonymousHandler implements IHandler<BlockAnonymousRequest, Result> {
  constructor(
    private readonly blocks: IBlockAccessor,
    private readonly modActions: IModActionAccessor,
    private readonly auditLog: IAuditAccessor,
    private readonly reports: IReportAccessor,
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

    const created = await this.blocks.store(
      new CreateBlockRequest(anonymousAuthorId, reason, actorId(actor), context),
    );
    if (!(created instanceof BlockCreatedResponse)) {
      return unavailable(correlationId, created, "blocks.store");
    }

    const recorded = await recordModeration(
      this.modActions,
      this.auditLog,
      this.reports,
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
