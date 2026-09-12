import type { IHandler } from "../../../Common/IHandler";
import type { FakeCommentState } from "../FakeCommentState";
import type { RemoveCommentRequest } from "../Requests/RemoveCommentRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentHasRepliesResponse } from "../Responses/CommentHasRepliesResponse";
import { CommentNotFoundResponse } from "../Responses/CommentNotFoundResponse";
import { CommentRemovedResponse } from "../Responses/CommentRemovedResponse";

// Mirrors the no-cascade parent key (D5): a comment with replies cannot go.
export class FakeRemoveCommentHandler implements IHandler<
  RemoveCommentRequest,
  | CommentRemovedResponse
  | CommentHasRepliesResponse
  | CommentNotFoundResponse
  | CommentAccessFailedResponse
> {
  constructor(private readonly state: FakeCommentState) {}

  handle(
    request: RemoveCommentRequest,
  ): Promise<
    | CommentRemovedResponse
    | CommentHasRepliesResponse
    | CommentNotFoundResponse
    | CommentAccessFailedResponse
  > {
    const { id, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new CommentAccessFailedResponse(correlationId, "COMMENT_FAKE_RESULT=fail"),
      );
    }
    if (!this.state.comments.has(id)) {
      return Promise.resolve(new CommentNotFoundResponse(correlationId));
    }
    if (this.state.hasReplies(id)) {
      return Promise.resolve(new CommentHasRepliesResponse(correlationId));
    }
    this.state.comments.delete(id);
    return Promise.resolve(new CommentRemovedResponse(correlationId));
  }
}
