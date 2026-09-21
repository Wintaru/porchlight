import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Sets `revoked_at` on one of the owner's tokens. The owner is part of the match, so
// a token that is not theirs answers not-found instead of needing a load first.
export class MarkAgentTokenRevokedRequest extends RequestBase {
  constructor(
    readonly tokenId: string,
    readonly ownerId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
