import type { IHandler } from "../../../Common/IHandler";
import type { StoredBody } from "../../../Common/StoredBody";
import type { FakeCommentState } from "../FakeCommentState";
import type { LoadCommentBodiesRequest } from "../Requests/LoadCommentBodiesRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentBodiesLoadedResponse } from "../Responses/CommentBodiesLoadedResponse";

export class FakeLoadCommentBodiesHandler implements IHandler<
  LoadCommentBodiesRequest,
  CommentBodiesLoadedResponse | CommentAccessFailedResponse
> {
  constructor(private readonly state: FakeCommentState) {}

  handle(
    request: LoadCommentBodiesRequest,
  ): Promise<CommentBodiesLoadedResponse | CommentAccessFailedResponse> {
    const { afterId, limit, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new CommentAccessFailedResponse(correlationId, "COMMENT_FAKE_RESULT=fail"),
      );
    }
    const bodies: StoredBody[] = [];
    for (const comment of this.state.comments.values()) {
      if (comment.status !== "tombstone" && (afterId === null || comment.id > afterId)) {
        bodies.push({
          id: comment.id,
          bodyMd: comment.bodyMd,
          bodyHtml: comment.bodyHtml,
        });
      }
    }
    bodies.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return Promise.resolve(
      new CommentBodiesLoadedResponse(correlationId, bodies.slice(0, limit)),
    );
  }
}
