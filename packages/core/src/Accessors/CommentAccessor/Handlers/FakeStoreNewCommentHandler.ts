import { MAX_COMMENT_DEPTH } from "../../../Common/Comment";
import type { IHandler } from "../../../Common/IHandler";
import type { LiveComment } from "../../../Common/LiveComment";
import type { FakeCommentState } from "../FakeCommentState";
import type { StoreNewCommentRequest } from "../Requests/StoreNewCommentRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentStoredResponse } from "../Responses/CommentStoredResponse";

// Mirrors the schema: `depth` is the parent's plus one (the `comments_set_depth`
// trigger), a missing parent fails the key, and a depth past the cap fails the CHECK.
export class FakeStoreNewCommentHandler implements IHandler<
  StoreNewCommentRequest,
  CommentStoredResponse | CommentAccessFailedResponse
> {
  constructor(private readonly state: FakeCommentState) {}

  handle(
    request: StoreNewCommentRequest,
  ): Promise<CommentStoredResponse | CommentAccessFailedResponse> {
    const { comment, correlationId, timestamp } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new CommentAccessFailedResponse(correlationId, "COMMENT_FAKE_RESULT=fail"),
      );
    }
    const depth = this.depthUnder(comment.parentId);
    if (depth === undefined) {
      return Promise.resolve(
        new CommentAccessFailedResponse(correlationId, "comments_parent_id_fkey"),
      );
    }
    if (depth > MAX_COMMENT_DEPTH) {
      return Promise.resolve(
        new CommentAccessFailedResponse(correlationId, "comments_depth_range"),
      );
    }
    const stored: LiveComment = {
      id: globalThis.crypto.randomUUID(),
      postId: comment.postId,
      parentId: comment.parentId,
      author: comment.author,
      bodyMd: comment.bodyMd,
      bodyHtml: comment.bodyHtml,
      depth,
      status: comment.status,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.state.comments.set(stored.id, stored);
    return Promise.resolve(new CommentStoredResponse(correlationId, stored));
  }

  private depthUnder(parentId: string | null): number | undefined {
    if (parentId === null) {
      return 0;
    }
    const parent = this.state.comments.get(parentId);
    return parent === undefined ? undefined : parent.depth + 1;
  }
}
