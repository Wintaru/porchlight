import type { AgentToken } from "../../../Common/AgentToken";
import { ResponseBase } from "../../../Common/ResponseBase";

// The member's choice is stored: the Client may now tell Supabase Auth to approve.
export class OAuthClientGrantedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly grant: AgentToken,
  ) {
    super(correlationId);
  }
}
