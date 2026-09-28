import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { MarkAgentTokenRevokedRequest } from "../Requests/MarkAgentTokenRevokedRequest";
import { AgentTokenAccessFailedResponse } from "../Responses/AgentTokenAccessFailedResponse";
import { AgentTokenNotFoundResponse } from "../Responses/AgentTokenNotFoundResponse";
import { AgentTokenRevokedResponse } from "../Responses/AgentTokenRevokedResponse";

// Revoking twice is not an error: the second call finds the row already revoked, so a
// double click on the settings page stays quiet. Both answers carry the row's OAuth
// client, so the caller withdraws the consent at Auth from the row, not the form (#88).
export class SupabaseMarkAgentTokenRevokedHandler implements IHandler<
  MarkAgentTokenRevokedRequest,
  AgentTokenRevokedResponse | AgentTokenNotFoundResponse | AgentTokenAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: MarkAgentTokenRevokedRequest,
  ): Promise<
    | AgentTokenRevokedResponse
    | AgentTokenNotFoundResponse
    | AgentTokenAccessFailedResponse
  > {
    const { tokenId, ownerId, timestamp, correlationId } = request;
    const { data, error } = await this.db
      .from("agent_tokens")
      .update({ revoked_at: timestamp.toISOString() })
      .eq("id", tokenId)
      .eq("owner_id", ownerId)
      .is("revoked_at", null)
      .select("oauth_client_id");
    if (error) {
      return new AgentTokenAccessFailedResponse(correlationId, error.message);
    }
    const row = data.at(0);
    if (row === undefined) {
      return await this.alreadyRevokedOrMissing(tokenId, ownerId, correlationId);
    }
    return new AgentTokenRevokedResponse(correlationId, row.oauth_client_id);
  }

  private async alreadyRevokedOrMissing(
    tokenId: string,
    ownerId: string,
    correlationId: string,
  ): Promise<
    | AgentTokenRevokedResponse
    | AgentTokenNotFoundResponse
    | AgentTokenAccessFailedResponse
  > {
    const { data, error } = await this.db
      .from("agent_tokens")
      .select("oauth_client_id")
      .eq("id", tokenId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (error) {
      return new AgentTokenAccessFailedResponse(correlationId, error.message);
    }
    return data === null
      ? new AgentTokenNotFoundResponse(correlationId)
      : new AgentTokenRevokedResponse(correlationId, data.oauth_client_id);
  }
}
