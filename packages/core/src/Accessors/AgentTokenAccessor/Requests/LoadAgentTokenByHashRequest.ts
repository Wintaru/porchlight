import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Finds the token behind a hash, revoked or expired ones included: the Manager decides
// what a dead token means.
export class LoadAgentTokenByHashRequest extends RequestBase {
  constructor(
    readonly tokenHash: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
