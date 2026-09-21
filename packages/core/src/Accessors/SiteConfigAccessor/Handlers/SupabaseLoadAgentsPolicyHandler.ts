import type { DbClient } from "@porchlight/db";

import {
  AGENTS_POLICIES,
  type AgentsPolicy,
  DEFAULT_AGENTS_POLICY,
} from "../../../Common/AgentsPolicy";
import type { IHandler } from "../../../Common/IHandler";
import type { LoadAgentsPolicyRequest } from "../Requests/LoadAgentsPolicyRequest";
import { AgentsPolicyLoadedResponse } from "../Responses/AgentsPolicyLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

const AGENTS_KEY = "agents";

function isAgentsPolicy(value: unknown): value is AgentsPolicy {
  return AGENTS_POLICIES.some((policy) => policy === value);
}

// The value column is jsonb; the key holds a JSON string. An absent row is the default
// (a database seeded before #27 has none), an unknown value is a failure, never a
// silent default.
export class SupabaseLoadAgentsPolicyHandler implements IHandler<
  LoadAgentsPolicyRequest,
  AgentsPolicyLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadAgentsPolicyRequest,
  ): Promise<AgentsPolicyLoadedResponse | SiteConfigAccessFailedResponse> {
    const { data, error } = await this.db
      .from("site_config")
      .select("value")
      .eq("key", AGENTS_KEY)
      .maybeSingle();
    if (error) {
      return new SiteConfigAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new AgentsPolicyLoadedResponse(request.correlationId, DEFAULT_AGENTS_POLICY);
    }
    if (!isAgentsPolicy(data.value)) {
      return new SiteConfigAccessFailedResponse(
        request.correlationId,
        `site_config.${AGENTS_KEY} holds ${JSON.stringify(data.value)}, not one of ${AGENTS_POLICIES.join(", ")}`,
      );
    }
    return new AgentsPolicyLoadedResponse(request.correlationId, data.value);
  }
}
