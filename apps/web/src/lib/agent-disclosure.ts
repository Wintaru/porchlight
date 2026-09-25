import {
  AgentDisclosureResponse,
  type AgentDisclosure,
  DEFAULT_AGENT_DISCLOSURE,
  GetAgentDisclosureRequest,
} from "@porchlight/core";
import { cache } from "react";

import { getDependencyContainer } from "@/lib/dependency-container";

// `site_config.agent_disclosure` (SPEC.md §17): whether a post an agent drafted says so
// under it. A `site_config` hiccup shows the line rather than hiding it, the side that
// tells the reader more. `cache()` dedupes the read for one request.
export const getAgentDisclosure = cache(async (): Promise<AgentDisclosure> => {
  try {
    const response = await getDependencyContainer().siteConfigManager.query(
      new GetAgentDisclosureRequest(),
    );
    return response instanceof AgentDisclosureResponse
      ? response.disclosure
      : DEFAULT_AGENT_DISCLOSURE;
  } catch (error: unknown) {
    console.error("agent disclosure load failed", error);
    return DEFAULT_AGENT_DISCLOSURE;
  }
});
