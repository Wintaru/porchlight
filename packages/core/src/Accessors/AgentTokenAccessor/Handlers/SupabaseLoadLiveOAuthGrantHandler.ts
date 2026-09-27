import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadLiveOAuthGrantRequest } from "../Requests/LoadLiveOAuthGrantRequest";
import { AgentTokenAccessFailedResponse } from "../Responses/AgentTokenAccessFailedResponse";
import { AgentTokenLoadedResponse } from "../Responses/AgentTokenLoadedResponse";
import { AgentTokenNotFoundResponse } from "../Responses/AgentTokenNotFoundResponse";
import { AGENT_TOKEN_COLUMNS, toAgentToken } from "../toAgentToken";

export class SupabaseLoadLiveOAuthGrantHandler implements IHandler<
  LoadLiveOAuthGrantRequest,
  AgentTokenLoadedResponse | AgentTokenNotFoundResponse | AgentTokenAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadLiveOAuthGrantRequest,
  ): Promise<
    AgentTokenLoadedResponse | AgentTokenNotFoundResponse | AgentTokenAccessFailedResponse
  > {
    const { ownerId, clientId, correlationId } = request;
    const { data, error } = await this.db
      .from("agent_tokens")
      .select(AGENT_TOKEN_COLUMNS)
      .eq("owner_id", ownerId)
      .eq("oauth_client_id", clientId)
      .is("revoked_at", null)
      .maybeSingle();
    if (error) {
      return new AgentTokenAccessFailedResponse(correlationId, error.message);
    }
    if (data === null) {
      return new AgentTokenNotFoundResponse(correlationId);
    }
    return new AgentTokenLoadedResponse(correlationId, toAgentToken(data));
  }
}
