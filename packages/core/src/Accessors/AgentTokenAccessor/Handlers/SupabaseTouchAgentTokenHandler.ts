import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { TouchAgentTokenRequest } from "../Requests/TouchAgentTokenRequest";
import { AgentTokenAccessFailedResponse } from "../Responses/AgentTokenAccessFailedResponse";
import { AgentTokenTouchedResponse } from "../Responses/AgentTokenTouchedResponse";

export class SupabaseTouchAgentTokenHandler implements IHandler<
  TouchAgentTokenRequest,
  AgentTokenTouchedResponse | AgentTokenAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: TouchAgentTokenRequest,
  ): Promise<AgentTokenTouchedResponse | AgentTokenAccessFailedResponse> {
    const { tokenId, timestamp, correlationId } = request;
    const { error } = await this.db
      .from("agent_tokens")
      .update({ last_used_at: timestamp.toISOString() })
      .eq("id", tokenId);
    if (error) {
      return new AgentTokenAccessFailedResponse(correlationId, error.message);
    }
    return new AgentTokenTouchedResponse(correlationId);
  }
}
