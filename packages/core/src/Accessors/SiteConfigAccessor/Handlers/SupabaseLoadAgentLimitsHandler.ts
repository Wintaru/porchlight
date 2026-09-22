import type { DbClient } from "@porchlight/db";

import { DEFAULT_AGENT_LIMITS, toAgentLimits } from "../../../Common/AgentLimits";
import type { IHandler } from "../../../Common/IHandler";
import type { LoadAgentLimitsRequest } from "../Requests/LoadAgentLimitsRequest";
import { AgentLimitsLoadedResponse } from "../Responses/AgentLimitsLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

const AGENT_LIMITS_KEY = "agent_limits";

// The value column is jsonb; the key holds `{ drafts_per_day, publishes_per_day }`. An
// absent row is the default, an unknown shape is a failure, never a silent default.
export class SupabaseLoadAgentLimitsHandler implements IHandler<
  LoadAgentLimitsRequest,
  AgentLimitsLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadAgentLimitsRequest,
  ): Promise<AgentLimitsLoadedResponse | SiteConfigAccessFailedResponse> {
    const { data, error } = await this.db
      .from("site_config")
      .select("value")
      .eq("key", AGENT_LIMITS_KEY)
      .maybeSingle();
    if (error) {
      return new SiteConfigAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new AgentLimitsLoadedResponse(request.correlationId, DEFAULT_AGENT_LIMITS);
    }
    const limits = toAgentLimits(data.value);
    if (limits === undefined) {
      return new SiteConfigAccessFailedResponse(
        request.correlationId,
        `site_config.${AGENT_LIMITS_KEY} holds ${JSON.stringify(data.value)}, not { drafts_per_day, publishes_per_day }`,
      );
    }
    return new AgentLimitsLoadedResponse(request.correlationId, limits);
  }
}
