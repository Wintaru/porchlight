import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Take back `memberId`'s mute or block of `targetId`. Removing nothing is not an error.
export class RemoveMemberBlockRequest extends RequestBase {
  constructor(
    readonly memberId: string,
    readonly targetId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
