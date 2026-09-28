import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ReplaceOAuthGrantRequest } from "../Requests/ReplaceOAuthGrantRequest";
import { AgentTokenAccessFailedResponse } from "../Responses/AgentTokenAccessFailedResponse";
import { AgentTokenStoredResponse } from "../Responses/AgentTokenStoredResponse";
import { AGENT_TOKEN_COLUMNS, toAgentToken } from "../toAgentToken";

// One call to `replace_oauth_grant`: the revoke and the insert commit together, under a
// lock on the member and the client, so the last of two presses wins.
export class SupabaseReplaceOAuthGrantHandler implements IHandler<
  ReplaceOAuthGrantRequest,
  AgentTokenStoredResponse | AgentTokenAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: ReplaceOAuthGrantRequest,
  ): Promise<AgentTokenStoredResponse | AgentTokenAccessFailedResponse> {
    const { ownerId, clientId, name, scopes, correlationId } = request;
    const { data, error } = await this.db
      .rpc("replace_oauth_grant", {
        p_owner_id: ownerId,
        p_client_id: clientId,
        p_name: name,
        p_scopes: [...scopes],
      })
      .select(AGENT_TOKEN_COLUMNS)
      .single();
    if (error) {
      return new AgentTokenAccessFailedResponse(correlationId, error.message);
    }
    return new AgentTokenStoredResponse(correlationId, toAgentToken(data));
  }
}
