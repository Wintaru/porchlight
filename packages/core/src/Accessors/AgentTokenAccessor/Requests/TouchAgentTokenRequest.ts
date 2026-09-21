import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Sets `last_used_at` to the request's timestamp, once per resolved request.
export class TouchAgentTokenRequest extends RequestBase {
  constructor(
    readonly tokenId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
