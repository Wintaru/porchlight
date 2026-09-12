import type { PostingPolicy } from "../../Common/PostingPolicy";

// The fake's rows: the one key read today. `failing` makes every load answer
// SiteConfigAccessFailedResponse, for the error path.
export class FakeSiteConfigState {
  constructor(
    public posting: PostingPolicy,
    readonly failing = false,
  ) {}
}
