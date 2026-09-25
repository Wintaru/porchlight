import type { Comment } from "../../../Common/Comment";
import type { IHandler } from "../../../Common/IHandler";
import type { FakeCommentState } from "../FakeCommentState";
import type { LoadCommentsByIdsRequest } from "../Requests/LoadCommentsByIdsRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentsLoadedResponse } from "../Responses/CommentsLoadedResponse";

export class FakeLoadCommentsByIdsHandler implements IHandler<
  LoadCommentsByIdsRequest,
  CommentsLoadedResponse | CommentAccessFailedResponse
> {
  constructor(private readonly state: FakeCommentState) {}

  handle(
    request: LoadCommentsByIdsRequest,
  ): Promise<CommentsLoadedResponse | CommentAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new CommentAccessFailedResponse(
          request.correlationId,
          "COMMENT_FAKE_RESULT=fail",
        ),
      );
    }
    const comments = [...new Set(request.ids)].flatMap((id): Comment[] => {
      const comment = this.state.comments.get(id);
      return comment === undefined ? [] : [comment];
    });
    return Promise.resolve(new CommentsLoadedResponse(request.correlationId, comments));
  }
}
