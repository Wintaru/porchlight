import { ResponseBase } from "../../../Common/ResponseBase";
import type { CommentDeletion } from "../CommentDeletion";

export class CommentDeletedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly outcome: CommentDeletion,
  ) {
    super(correlationId);
  }
}
