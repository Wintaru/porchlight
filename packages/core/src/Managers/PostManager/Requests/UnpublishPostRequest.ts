import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A published or pending post goes back to `draft`. The slug stays, so the URL is
// reserved for the post's return.
export class UnpublishPostRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly postId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
