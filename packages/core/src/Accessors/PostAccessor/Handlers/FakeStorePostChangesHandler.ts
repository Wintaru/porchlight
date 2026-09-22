import type { IHandler } from "../../../Common/IHandler";
import type { Post } from "../../../Common/Post";
import type { FakePostState } from "../FakePostState";
import type { StorePostChangesRequest } from "../Requests/StorePostChangesRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostNotFoundResponse } from "../Responses/PostNotFoundResponse";
import { PostStoredResponse } from "../Responses/PostStoredResponse";

export class FakeStorePostChangesHandler implements IHandler<
  StorePostChangesRequest,
  PostStoredResponse | PostNotFoundResponse | PostAccessFailedResponse
> {
  constructor(private readonly state: FakePostState) {}

  handle(
    request: StorePostChangesRequest,
  ): Promise<PostStoredResponse | PostNotFoundResponse | PostAccessFailedResponse> {
    const { id, changes, correlationId, timestamp } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    const current = this.state.posts.get(id);
    if (current === undefined) {
      return Promise.resolve(new PostNotFoundResponse(correlationId));
    }
    const stored: Post = {
      ...current,
      title: changes.title ?? current.title,
      bodyMd: changes.bodyMd ?? current.bodyMd,
      bodyHtml: changes.bodyHtml ?? current.bodyHtml,
      summary: changes.summary === undefined ? current.summary : changes.summary,
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
      publishedAt:
        changes.publishedAt === undefined ? current.publishedAt : changes.publishedAt,
      updatedAt: timestamp,
    };
    this.state.posts.set(id, stored);
    return Promise.resolve(new PostStoredResponse(correlationId, stored));
  }
}
