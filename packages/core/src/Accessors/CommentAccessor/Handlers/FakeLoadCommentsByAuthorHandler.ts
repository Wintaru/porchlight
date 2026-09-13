import type { IHandler } from "../../../Common/IHandler";
import type { FakeCommentState } from "../FakeCommentState";
import type { LoadCommentsByAuthorRequest } from "../Requests/LoadCommentsByAuthorRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentsLoadedResponse } from "../Responses/CommentsLoadedResponse";

type Result = CommentsLoadedResponse | CommentAccessFailedResponse;

export class FakeLoadCommentsByAuthorHandler implements IHandler<
  LoadCommentsByAuthorRequest,
  Result
> {
  constructor(private readonly state: FakeCommentState) {}

  handle(request: LoadCommentsByAuthorRequest): Promise<Result> {
    if (this.state.failing) {
      return Promise.resolve(
        new CommentAccessFailedResponse(
          request.correlationId,
          "COMMENT_FAKE_RESULT=fail",
        ),
      );
    }
    const comments = [...this.state.comments.values()]
      .filter(
        (comment) =>
          comment.status !== "tombstone" &&
          comment.author.kind === "member" &&
          comment.author.profileId === request.profileId,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Promise.resolve(new CommentsLoadedResponse(request.correlationId, comments));
  }
}
