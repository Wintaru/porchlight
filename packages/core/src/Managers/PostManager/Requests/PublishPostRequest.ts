import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A draft goes live: `published` for a trusted member, admin or moderator; `pending`
// for a member on probation, where it waits for the queue (D7).
export class PublishPostRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly postId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
