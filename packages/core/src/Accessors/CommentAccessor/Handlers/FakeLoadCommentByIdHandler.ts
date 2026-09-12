import type { IHandler } from "../../../Common/IHandler";
import type { FakeCommentState } from "../FakeCommentState";
import type { LoadCommentByIdRequest } from "../Requests/LoadCommentByIdRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentLoadedResponse } from "../Responses/CommentLoadedResponse";
import { CommentNotFoundResponse } from "../Responses/CommentNotFoundResponse";

export class FakeLoadCommentByIdHandler implements IHandler<
  LoadCommentByIdRequest,
  CommentLoadedResponse | CommentNotFoundResponse | CommentAccessFailedResponse
> {
  constructor(private readonly state: FakeCommentState) {}

  handle(
    request: LoadCommentByIdRequest,
  ): Promise<
    CommentLoadedResponse | CommentNotFoundResponse | CommentAccessFailedResponse
  > {
    if (this.state.failing) {
      return Promise.resolve(
        new CommentAccessFailedResponse(
          request.correlationId,
          "COMMENT_FAKE_RESULT=fail",
        ),
      );
    }
    const comment = this.state.comments.get(request.id);
    return Promise.resolve(
      comment === undefined
        ? new CommentNotFoundResponse(request.correlationId)
        : new CommentLoadedResponse(request.correlationId, comment),
    );
  }
}
