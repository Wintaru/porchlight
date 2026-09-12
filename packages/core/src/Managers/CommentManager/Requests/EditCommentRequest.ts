import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The author, or an admin, replaces the body. Status and place in the tree stay.
export class EditCommentRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly commentId: string,
    readonly bodyMd: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
