import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { readAllPages } from "../../../Utilities/collections/readAllPages";
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
    // Every one, past PostgREST's row cap: an export lists them all.
    const read = await readAllPages((from, to) =>
      this.db
        .from("agent_tokens")
        .select(AGENT_TOKEN_COLUMNS)
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    );
    if ("error" in read) {
      return new AgentTokenAccessFailedResponse(correlationId, read.error);
    }
    return new AgentTokensLoadedResponse(correlationId, read.rows.map(toAgentToken));
  }
}
