import type { IHandler } from "../../../Common/IHandler";
import type { TombstoneComment } from "../../../Common/TombstoneComment";
import type { FakeCommentState } from "../FakeCommentState";
import type { StoreCommentTombstoneRequest } from "../Requests/StoreCommentTombstoneRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentNotFoundResponse } from "../Responses/CommentNotFoundResponse";
import { CommentStoredResponse } from "../Responses/CommentStoredResponse";

export class FakeStoreCommentTombstoneHandler implements IHandler<
  StoreCommentTombstoneRequest,
  CommentStoredResponse | CommentNotFoundResponse | CommentAccessFailedResponse
> {
  constructor(private readonly state: FakeCommentState) {}

  handle(
    request: StoreCommentTombstoneRequest,
  ): Promise<
    CommentStoredResponse | CommentNotFoundResponse | CommentAccessFailedResponse
  > {
    const { id, correlationId, timestamp } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new CommentAccessFailedResponse(correlationId, "COMMENT_FAKE_RESULT=fail"),
      );
    }
    const current = this.state.comments.get(id);
    if (current === undefined) {
      return Promise.resolve(new CommentNotFoundResponse(correlationId));
    }
    const stored: TombstoneComment = {
      id: current.id,
      postId: current.postId,
      parentId: current.parentId,
      depth: current.depth,
      status: "tombstone",
      createdAt: current.createdAt,
      updatedAt: timestamp,
    };
    this.state.comments.set(id, stored);
    return Promise.resolve(new CommentStoredResponse(correlationId, stored));
  }
}
