import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The rows any of `memberIds` hold about `targetId`: "did the post's author or the
// parent's author mute or block the member who is commenting?" One round trip for both.
export class LoadMemberBlocksOfTargetRequest extends RequestBase {
  constructor(
    readonly targetId: string,
    readonly memberIds: readonly string[],
    context?: RequestContext,
  ) {
    super(context);
  }
}
