import type { IHandler } from "../../../Common/IHandler";
import type { FakeCommentState } from "../FakeCommentState";
import type { LoadCommentsByStatusRequest } from "../Requests/LoadCommentsByStatusRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentsLoadedResponse } from "../Responses/CommentsLoadedResponse";

export class FakeLoadCommentsByStatusHandler implements IHandler<
  LoadCommentsByStatusRequest,
  CommentsLoadedResponse | CommentAccessFailedResponse
> {
  constructor(private readonly state: FakeCommentState) {}

  handle(
    request: LoadCommentsByStatusRequest,
  ): Promise<CommentsLoadedResponse | CommentAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new CommentAccessFailedResponse(
          request.correlationId,
          "COMMENT_FAKE_RESULT=fail",
        ),
      );
    }
    const comments = [...this.state.comments.values()]
      .filter((comment) => comment.status === request.status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Promise.resolve(new CommentsLoadedResponse(request.correlationId, comments));
  }
}
