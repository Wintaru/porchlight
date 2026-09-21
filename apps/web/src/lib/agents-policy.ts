import {
  AgentsPolicyResponse,
  GetAgentsPolicyRequest,
  type AgentsPolicy,
} from "@porchlight/core";
import { cache } from "react";

import { getDependencyContainer } from "@/lib/dependency-container";

// `site_config.agents` (SPEC.md §17): whether the settings page shows the Agents
// section. A `site_config` hiccup closes the section rather than opening it, the
// cautious side. `cache()` dedupes the read for one request.
export const getAgentsPolicy = cache(async (): Promise<AgentsPolicy> => {
  try {
    const response = await getDependencyContainer().siteConfigManager.query(
      new GetAgentsPolicyRequest(),
    );
    return response instanceof AgentsPolicyResponse ? response.policy : "off";
  } catch (error: unknown) {
    console.error("agents policy load failed", error);
    return "off";
  }
});
