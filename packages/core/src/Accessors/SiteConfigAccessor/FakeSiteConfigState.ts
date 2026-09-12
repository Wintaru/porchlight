import type { CommentPolicy } from "../../Common/CommentPolicy";
import type { PostingPolicy } from "../../Common/PostingPolicy";

// The fake's rows: the two D20 keys read today. `failing` makes every load answer
// SiteConfigAccessFailedResponse, for the error path.
export class FakeSiteConfigState {
  constructor(
    public posting: PostingPolicy,
    public comments: CommentPolicy,
    readonly failing = false,
  ) {}
}
