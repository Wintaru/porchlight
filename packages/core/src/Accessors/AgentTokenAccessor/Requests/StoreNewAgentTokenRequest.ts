import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { NewAgentToken } from "../NewAgentToken";

// Inserts a minted token's row.
export class StoreNewAgentTokenRequest extends RequestBase {
  constructor(
    readonly token: NewAgentToken,
    context?: RequestContext,
  ) {
    super(context);
  }
}
