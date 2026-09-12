import type { Comment } from "../../../Common/Comment";
import type { IHandler } from "../../../Common/IHandler";
import type { CommentReadership } from "../CommentReadership";
import type { FakeCommentState } from "../FakeCommentState";
import type { LoadCommentsForPostRequest } from "../Requests/LoadCommentsForPostRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentsLoadedResponse } from "../Responses/CommentsLoadedResponse";

// The same wall the Supabase handler asks the store for, applied in memory.
export class FakeLoadCommentsForPostHandler implements IHandler<
  LoadCommentsForPostRequest,
  CommentsLoadedResponse | CommentAccessFailedResponse
> {
  constructor(private readonly state: FakeCommentState) {}

  handle(
    request: LoadCommentsForPostRequest,
  ): Promise<CommentsLoadedResponse | CommentAccessFailedResponse> {
    const { postId, readership, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new CommentAccessFailedResponse(correlationId, "COMMENT_FAKE_RESULT=fail"),
      );
    }
    const comments = [...this.state.comments.values()]
      .filter((comment) => comment.postId === postId && readable(comment, readership))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return Promise.resolve(new CommentsLoadedResponse(correlationId, comments));
  }
}

function readable(comment: Comment, readership: CommentReadership): boolean {
  if (readership.kind === "all") {
    return true;
  }
  if (comment.status === "visible" || comment.status === "tombstone") {
    return true;
  }
  return (
    readership.kind === "member" &&
    comment.author.kind === "member" &&
    comment.author.profileId === readership.profileId
  );
}
