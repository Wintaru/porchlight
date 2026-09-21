import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A member revokes one of their own tokens. Revoked is final: there is no un-revoke.
export class RevokeAgentTokenRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly tokenId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
