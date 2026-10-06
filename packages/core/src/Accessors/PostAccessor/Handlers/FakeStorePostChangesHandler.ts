import type { IHandler } from "../../../Common/IHandler";
import type { Post } from "../../../Common/Post";
import type { FakePostState } from "../FakePostState";
import type { StorePostChangesRequest } from "../Requests/StorePostChangesRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostNotFoundResponse } from "../Responses/PostNotFoundResponse";
import { PostStoredResponse } from "../Responses/PostStoredResponse";
import { PostVersionChangedResponse } from "../Responses/PostVersionChangedResponse";

type Result =
  | PostStoredResponse
  | PostNotFoundResponse
  | PostVersionChangedResponse
  | PostAccessFailedResponse;

export class FakeStorePostChangesHandler implements IHandler<
  StorePostChangesRequest,
  Result
> {
  constructor(private readonly state: FakePostState) {}

  handle(request: StorePostChangesRequest): Promise<Result> {
    const { id, changes, correlationId, timestamp, expectedVersion } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    const current = this.state.posts.get(id);
    if (current === undefined) {
      return Promise.resolve(new PostNotFoundResponse(correlationId));
    }
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      return Promise.resolve(new PostVersionChangedResponse(correlationId));
    }
    // The store's trigger refuses a second agent draft; the fake answers the same way.
    if (current.agentDraftMd !== null && changes.agentDraftMd !== undefined) {
      return Promise.resolve(
        new PostAccessFailedResponse(
          correlationId,
          "agent_draft_md is frozen once written",
        ),
      );
    }
    const stored: Post = {
      ...current,
      title: changes.title ?? current.title,
      bodyMd: changes.bodyMd ?? current.bodyMd,
      bodyHtml: changes.bodyHtml ?? current.bodyHtml,
      summary: changes.summary === undefined ? current.summary : changes.summary,
      coverMediaId:
        changes.coverMediaId === undefined ? current.coverMediaId : changes.coverMediaId,
      coverFrame: changes.coverFrame ?? current.coverFrame,
      visibility: changes.visibility ?? current.visibility,
      commentsEnabled: changes.commentsEnabled ?? current.commentsEnabled,
      tags: changes.tags ?? current.tags,
      status: changes.status ?? current.status,
      rejectionReason:
        changes.rejectionReason === undefined
          ? current.rejectionReason
          : changes.rejectionReason,
      reviewedAt:
        changes.reviewedAt === undefined ? current.reviewedAt : changes.reviewedAt,
      agentDraftMd: current.agentDraftMd ?? changes.agentDraftMd ?? null,
      agentEditedAt:
        changes.agentEditedAt === undefined
          ? current.agentEditedAt
          : changes.agentEditedAt,
      publishedAt:
        changes.publishedAt === undefined ? current.publishedAt : changes.publishedAt,
      updatedAt: timestamp,
      // The store's `posts_bump_version` trigger.
      version: current.version + 1,
    };
    // The store's `posts_keep_revision` trigger: a post that is out keeps the version
    // readers saw when its words change.
    if (
      current.publishedAt !== null &&
      (stored.title !== current.title ||
        stored.summary !== current.summary ||
        stored.bodyMd !== current.bodyMd)
    ) {
      this.state.revisions.push({
        id: globalThis.crypto.randomUUID(),
        postId: id,
        title: current.title,
        summary: current.summary,
        bodyMd: current.bodyMd,
        savedAt: current.updatedAt,
        replacedAt: timestamp,
      });
    }
    this.state.posts.set(id, stored);
    return Promise.resolve(new PostStoredResponse(correlationId, stored));
  }
}
