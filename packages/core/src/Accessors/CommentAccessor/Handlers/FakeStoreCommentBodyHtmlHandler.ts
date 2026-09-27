import type { IHandler } from "../../../Common/IHandler";
import type { FakeCommentState } from "../FakeCommentState";
import type { StoreCommentBodyHtmlRequest } from "../Requests/StoreCommentBodyHtmlRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentBodyHtmlStoredResponse } from "../Responses/CommentBodyHtmlStoredResponse";

export class FakeStoreCommentBodyHtmlHandler implements IHandler<
  StoreCommentBodyHtmlRequest,
  CommentBodyHtmlStoredResponse | CommentAccessFailedResponse
> {
  constructor(private readonly state: FakeCommentState) {}

  handle(
    request: StoreCommentBodyHtmlRequest,
  ): Promise<CommentBodyHtmlStoredResponse | CommentAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new CommentAccessFailedResponse(
          request.correlationId,
          "COMMENT_FAKE_RESULT=fail",
        ),
      );
    }
    const comment = this.state.comments.get(request.id);
    if (comment !== undefined && comment.status !== "tombstone") {
      this.state.comments.set(comment.id, { ...comment, bodyHtml: request.bodyHtml });
    }
    return Promise.resolve(new CommentBodyHtmlStoredResponse(request.correlationId));
  }
}
