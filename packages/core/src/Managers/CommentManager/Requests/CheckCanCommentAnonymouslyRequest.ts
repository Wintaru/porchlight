import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// "May an anonymous write comment here?" (D20). The post page asks this for a visitor
// the same way CheckCanCommentRequest asks for a member, before it shows either form.
export class CheckCanCommentAnonymouslyRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly postId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
