import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { MarkAgentTokenRevokedRequest } from "../Requests/MarkAgentTokenRevokedRequest";
import { AgentTokenAccessFailedResponse } from "../Responses/AgentTokenAccessFailedResponse";
import { AgentTokenNotFoundResponse } from "../Responses/AgentTokenNotFoundResponse";
import { AgentTokenRevokedResponse } from "../Responses/AgentTokenRevokedResponse";

// Revoking twice is not an error: the second call matches the row and rewrites the
// same column, so a double click on the settings page stays quiet.
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
      .select("id");
    if (error) {
      return new AgentTokenAccessFailedResponse(correlationId, error.message);
    }
    if (data.length === 0) {
      return await this.alreadyRevokedOrMissing(tokenId, ownerId, correlationId);
    }
    return new AgentTokenRevokedResponse(correlationId);
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
      .select("id")
      .eq("id", tokenId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (error) {
      return new AgentTokenAccessFailedResponse(correlationId, error.message);
    }
    return data === null
      ? new AgentTokenNotFoundResponse(correlationId)
      : new AgentTokenRevokedResponse(correlationId);
  }
}
