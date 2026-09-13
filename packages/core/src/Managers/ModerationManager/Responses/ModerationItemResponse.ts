import type { LiveComment } from "../../../Common/LiveComment";
import type { Post } from "../../../Common/Post";
import { ResponseBase } from "../../../Common/ResponseBase";

// The item as it stands after an approve, reject, hide, remove or escalate action.
export class ModerationItemResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly item:
      | { readonly kind: "post"; readonly post: Post }
      | { readonly kind: "comment"; readonly comment: LiveComment },
  ) {
    super(correlationId);
  }
}
