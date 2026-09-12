import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The D15 admission rules for one anonymous submission (SPEC.md Sec4): Turnstile,
// identity, the block list, then rate limits. evaluate is the one intent: "may this
// write proceed, and as whom." PostManager and CommentManager both call it, since
// Manager may not call Manager and the sequence is identical for a post and a comment.
export interface IAnonymousGuardEngine {
  evaluate(request: RequestBase): Promise<ResponseBase>;
}
