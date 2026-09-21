import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Every token a member has minted, newest first, revoked ones included.
export class ListAgentTokensByOwnerRequest extends RequestBase {
  constructor(
    readonly ownerId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
