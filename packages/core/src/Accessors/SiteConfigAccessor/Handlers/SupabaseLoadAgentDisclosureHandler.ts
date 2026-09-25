import type { DbClient } from "@porchlight/db";

import {
  AGENT_DISCLOSURES,
  type AgentDisclosure,
  DEFAULT_AGENT_DISCLOSURE,
} from "../../../Common/AgentDisclosure";
import type { IHandler } from "../../../Common/IHandler";
import type { LoadAgentDisclosureRequest } from "../Requests/LoadAgentDisclosureRequest";
import { AgentDisclosureLoadedResponse } from "../Responses/AgentDisclosureLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

const AGENT_DISCLOSURE_KEY = "agent_disclosure";

function isAgentDisclosure(value: unknown): value is AgentDisclosure {
  return AGENT_DISCLOSURES.some((disclosure) => disclosure === value);
}

// The value column is jsonb; the key holds a JSON string. An absent row is the default
// (a database seeded before #30 has none), an unknown value is a failure, never a
// silent default.
export class SupabaseLoadAgentDisclosureHandler implements IHandler<
  LoadAgentDisclosureRequest,
  AgentDisclosureLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadAgentDisclosureRequest,
  ): Promise<AgentDisclosureLoadedResponse | SiteConfigAccessFailedResponse> {
    const { data, error } = await this.db
      .from("site_config")
      .select("value")
      .eq("key", AGENT_DISCLOSURE_KEY)
      .maybeSingle();
    if (error) {
      return new SiteConfigAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new AgentDisclosureLoadedResponse(
        request.correlationId,
        DEFAULT_AGENT_DISCLOSURE,
      );
    }
    if (!isAgentDisclosure(data.value)) {
      return new SiteConfigAccessFailedResponse(
        request.correlationId,
        `site_config.${AGENT_DISCLOSURE_KEY} holds ${JSON.stringify(data.value)}, not one of ${AGENT_DISCLOSURES.join(", ")}`,
      );
    }
    return new AgentDisclosureLoadedResponse(request.correlationId, data.value);
  }
}
