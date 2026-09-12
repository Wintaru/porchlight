import type { CommentPolicy } from "../../../Common/CommentPolicy";
import { ResponseBase } from "../../../Common/ResponseBase";

export class CommentPolicyLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly policy: CommentPolicy,
  ) {
    super(correlationId);
  }
}
