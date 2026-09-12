import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Hard delete by the author or an admin. Comments on it go with it (D6).
export class DeletePostRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly postId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
