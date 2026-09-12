import type { PostingPolicy } from "../../../Common/PostingPolicy";
import { ResponseBase } from "../../../Common/ResponseBase";

export class PostingPolicyLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly policy: PostingPolicy,
  ) {
    super(correlationId);
  }
}
