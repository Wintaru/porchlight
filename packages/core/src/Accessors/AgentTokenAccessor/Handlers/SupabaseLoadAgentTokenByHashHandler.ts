import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadAgentTokenByHashRequest } from "../Requests/LoadAgentTokenByHashRequest";
import { AgentTokenAccessFailedResponse } from "../Responses/AgentTokenAccessFailedResponse";
import { AgentTokenLoadedResponse } from "../Responses/AgentTokenLoadedResponse";
import { AgentTokenNotFoundResponse } from "../Responses/AgentTokenNotFoundResponse";
import { AGENT_TOKEN_COLUMNS, toAgentToken } from "../toAgentToken";

export class SupabaseLoadAgentTokenByHashHandler implements IHandler<
  LoadAgentTokenByHashRequest,
  AgentTokenLoadedResponse | AgentTokenNotFoundResponse | AgentTokenAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadAgentTokenByHashRequest,
  ): Promise<
    AgentTokenLoadedResponse | AgentTokenNotFoundResponse | AgentTokenAccessFailedResponse
  > {
    const { tokenHash, correlationId } = request;
    const { data, error } = await this.db
      .from("agent_tokens")
      .select(AGENT_TOKEN_COLUMNS)
      .eq("token_hash", tokenHash)
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
