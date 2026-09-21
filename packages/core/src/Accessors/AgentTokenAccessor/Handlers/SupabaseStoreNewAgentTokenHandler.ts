import type { DbClient, TablesInsert } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreNewAgentTokenRequest } from "../Requests/StoreNewAgentTokenRequest";
import { AgentTokenAccessFailedResponse } from "../Responses/AgentTokenAccessFailedResponse";
import { AgentTokenStoredResponse } from "../Responses/AgentTokenStoredResponse";
import { AGENT_TOKEN_COLUMNS, toAgentToken } from "../toAgentToken";

export class SupabaseStoreNewAgentTokenHandler implements IHandler<
  StoreNewAgentTokenRequest,
  AgentTokenStoredResponse | AgentTokenAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreNewAgentTokenRequest,
  ): Promise<AgentTokenStoredResponse | AgentTokenAccessFailedResponse> {
    const { token, correlationId } = request;
    const row: TablesInsert<"agent_tokens"> = {
      owner_id: token.ownerId,
      name: token.name,
      token_hash: token.tokenHash,
      scopes: [...token.scopes],
      expires_at: token.expiresAt === null ? null : token.expiresAt.toISOString(),
    };
    const { data, error } = await this.db
      .from("agent_tokens")
      .insert(row)
      .select(AGENT_TOKEN_COLUMNS)
      .single();
    if (error) {
      return new AgentTokenAccessFailedResponse(correlationId, error.message);
    }
    return new AgentTokenStoredResponse(correlationId, toAgentToken(data));
  }
}
