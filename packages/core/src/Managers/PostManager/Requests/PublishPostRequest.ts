import type { Actor } from "../../../Common/Actor";
import type { RequestOrigin } from "../../../Common/RequestOrigin";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A draft goes live: `published` for a trusted member, admin or moderator; `pending`
// for a member on probation, where it waits for the queue (D7). `origin` goes into the
// evidence row for the text that goes out (SPEC.md §7, #65).
export class PublishPostRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly postId: string,
    readonly origin: RequestOrigin,
    context?: RequestContext,
  ) {
    super(context);
  }
}
