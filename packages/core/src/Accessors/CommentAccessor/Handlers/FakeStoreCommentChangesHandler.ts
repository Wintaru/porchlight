import type { IHandler } from "../../../Common/IHandler";
import type { FakeCommentState } from "../FakeCommentState";
import type { StoreCommentChangesRequest } from "../Requests/StoreCommentChangesRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentNotFoundResponse } from "../Responses/CommentNotFoundResponse";
import { CommentStoredResponse } from "../Responses/CommentStoredResponse";

export class FakeStoreCommentChangesHandler implements IHandler<
  StoreCommentChangesRequest,
  CommentStoredResponse | CommentNotFoundResponse | CommentAccessFailedResponse
> {
  constructor(private readonly state: FakeCommentState) {}

  handle(
    request: StoreCommentChangesRequest,
  ): Promise<
    CommentStoredResponse | CommentNotFoundResponse | CommentAccessFailedResponse
  > {
    const { id, changes, correlationId, timestamp } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new CommentAccessFailedResponse(correlationId, "COMMENT_FAKE_RESULT=fail"),
      );
    }
    const current = this.state.comments.get(id);
    if (current === undefined) {
      return Promise.resolve(new CommentNotFoundResponse(correlationId));
    }
    if (current.status === "tombstone") {
      // The schema's `comments_tombstone_is_empty` CHECK refuses a body on a tombstone.
      return Promise.resolve(
        new CommentAccessFailedResponse(correlationId, "comments_tombstone_is_empty"),
      );
    }
    const stored = {
      ...current,
      bodyMd: changes.bodyMd,
      bodyHtml: changes.bodyHtml,
      updatedAt: timestamp,
    };
    this.state.comments.set(id, stored);
    return Promise.resolve(new CommentStoredResponse(correlationId, stored));
  }
}
