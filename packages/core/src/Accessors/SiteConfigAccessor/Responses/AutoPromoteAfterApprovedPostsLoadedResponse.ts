import type { AutoPromoteAfterApprovedPosts } from "../../../Common/AutoPromoteRule";
import { ResponseBase } from "../../../Common/ResponseBase";

export class AutoPromoteAfterApprovedPostsLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly afterApprovedPosts: AutoPromoteAfterApprovedPosts,
  ) {
    super(correlationId);
  }
}
