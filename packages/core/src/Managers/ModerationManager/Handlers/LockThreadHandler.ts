import type { IAuditAccessor } from "../../../Accessors/AuditAccessor/IAuditAccessor";
import type { IModActionAccessor } from "../../../Accessors/ModActionAccessor/IModActionAccessor";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { LoadPostByIdRequest } from "../../../Accessors/PostAccessor/Requests/LoadPostByIdRequest";
import { StorePostChangesRequest } from "../../../Accessors/PostAccessor/Requests/StorePostChangesRequest";
import { PostLoadedResponse } from "../../../Accessors/PostAccessor/Responses/PostLoadedResponse";
import { PostNotFoundResponse } from "../../../Accessors/PostAccessor/Responses/PostNotFoundResponse";
import { PostStoredResponse } from "../../../Accessors/PostAccessor/Responses/PostStoredResponse";
import type { IReportAccessor } from "../../../Accessors/ReportAccessor/IReportAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { actorId } from "../actorId";
import { permit } from "../permit";
import { recordModeration } from "../recordModeration";
import type { LockThreadRequest } from "../Requests/LockThreadRequest";
import type { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import type { ModerationUnavailableResponse } from "../Responses/ModerationUnavailableResponse";
import { NoSuchItemResponse } from "../Responses/NoSuchItemResponse";
import { ThreadLockedResponse } from "../Responses/ThreadLockedResponse";
import { unavailable } from "../unavailable";

type Result =
  | ThreadLockedResponse
  | NoSuchItemResponse
  | ModerationForbiddenResponse
  | ModerationUnavailableResponse;

// Reuses `posts.comments_enabled` (SPEC.md §5): the same switch the author's own editor
// toggle writes, set to `false` here instead (see DECISIONS.md).
export class LockThreadHandler implements IHandler<LockThreadRequest, Result> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly modActions: IModActionAccessor,
    private readonly auditLog: IAuditAccessor,
    private readonly reports: IReportAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: LockThreadRequest): Promise<Result> {
    const { correlationId, actor, postId, timestamp } = request;
    const context = { correlationId, timestamp };

    const loaded = await this.posts.load(new LoadPostByIdRequest(postId, context));
    if (loaded instanceof PostNotFoundResponse) {
      return new NoSuchItemResponse(correlationId);
    }
    if (!(loaded instanceof PostLoadedResponse)) {
      return unavailable(correlationId, loaded, "posts.load");
    }

    const refused = await permit(
      this.permissions,
      actor,
      "moderation.act",
      {
        kind: "post",
        id: loaded.post.id,
        author: loaded.post.author,
        status: loaded.post.status,
        commentsEnabled: loaded.post.commentsEnabled,
      },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    const stored = await this.posts.store(
      new StorePostChangesRequest(postId, { commentsEnabled: false }, context),
    );
    if (!(stored instanceof PostStoredResponse)) {
      return unavailable(correlationId, stored, "posts.store");
    }

    const recorded = await recordModeration(
      this.modActions,
      this.auditLog,
      this.reports,
      {
        actorId: actorId(actor),
        action: "lock_thread",
        target: { kind: "post", id: postId },
        reason: null,
        event: "mod.action",
        auditSubject: { kind: "post", id: postId },
        auditDetails: { action: "lock_thread" },
      },
      context,
    );
    if (recorded !== undefined) {
      return recorded;
    }
    return new ThreadLockedResponse(correlationId, stored.post);
  }
}
