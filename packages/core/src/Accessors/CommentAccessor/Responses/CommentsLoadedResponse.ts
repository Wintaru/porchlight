import type { Comment } from "../../../Common/Comment";
import { ResponseBase } from "../../../Common/ResponseBase";

// A flat list, oldest first. The Manager builds the tree.
export class CommentsLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly comments: readonly Comment[],
  ) {
    super(correlationId);
  }
}
