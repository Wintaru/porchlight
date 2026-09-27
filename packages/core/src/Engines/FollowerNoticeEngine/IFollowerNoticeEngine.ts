import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// Turns a post that just went out into a `post.published` notice for each member who
// follows its author or one of its tags (#24, D20), leaving out the author and anyone
// who muted or blocked the author (#23).
export interface IFollowerNoticeEngine {
  transform(request: RequestBase): Promise<ResponseBase>;
}
