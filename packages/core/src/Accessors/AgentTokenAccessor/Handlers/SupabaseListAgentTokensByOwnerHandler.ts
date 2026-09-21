import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ListAgentTokensByOwnerRequest } from "../Requests/ListAgentTokensByOwnerRequest";
import { AgentTokenAccessFailedResponse } from "../Responses/AgentTokenAccessFailedResponse";
import { AgentTokensLoadedResponse } from "../Responses/AgentTokensLoadedResponse";
import { AGENT_TOKEN_COLUMNS, toAgentToken } from "../toAgentToken";

export class SupabaseListAgentTokensByOwnerHandler implements IHandler<
  ListAgentTokensByOwnerRequest,
  AgentTokensLoadedResponse | AgentTokenAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: ListAgentTokensByOwnerRequest,
  ): Promise<AgentTokensLoadedResponse | AgentTokenAccessFailedResponse> {
    const { ownerId, correlationId } = request;
    const { data, error } = await this.db
      .from("agent_tokens")
      .select(AGENT_TOKEN_COLUMNS)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    if (error) {
      return new AgentTokenAccessFailedResponse(correlationId, error.message);
    }
    return new AgentTokensLoadedResponse(correlationId, data.map(toAgentToken));
  }
}
