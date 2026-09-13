import type { IHandler } from "../../../Common/IHandler";
import type { FakeCommentState } from "../FakeCommentState";
import type { StoreCommentStatusRequest } from "../Requests/StoreCommentStatusRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentNotFoundResponse } from "../Responses/CommentNotFoundResponse";
import { CommentStoredResponse } from "../Responses/CommentStoredResponse";

export class FakeStoreCommentStatusHandler implements IHandler<
  StoreCommentStatusRequest,
  CommentStoredResponse | CommentNotFoundResponse | CommentAccessFailedResponse
> {
  constructor(private readonly state: FakeCommentState) {}

  handle(
    request: StoreCommentStatusRequest,
  ): Promise<
    CommentStoredResponse | CommentNotFoundResponse | CommentAccessFailedResponse
  > {
    const { id, status, rejectionReason, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new CommentAccessFailedResponse(correlationId, "COMMENT_FAKE_RESULT=fail"),
      );
    }
    const current = this.state.comments.get(id);
    if (current === undefined || current.status === "tombstone") {
      return Promise.resolve(new CommentNotFoundResponse(correlationId));
    }
    const stored = {
      ...current,
      status,
      rejectionReason:
        rejectionReason === undefined ? current.rejectionReason : rejectionReason,
    };
    this.state.comments.set(id, stored);
    return Promise.resolve(new CommentStoredResponse(correlationId, stored));
  }
}
