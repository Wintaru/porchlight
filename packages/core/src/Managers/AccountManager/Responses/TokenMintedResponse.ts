import type { AgentToken } from "../../../Common/AgentToken";
import { ResponseBase } from "../../../Common/ResponseBase";

// The one time the raw token exists outside the member's own hands. The Client shows
// it once and never logs it.
export class TokenMintedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly rawToken: string,
    readonly token: AgentToken,
  ) {
    super(correlationId);
  }
}
