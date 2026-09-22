import type { IRateLimitAccessor } from "../Accessors/RateLimitAccessor/IRateLimitAccessor";
import type { ISiteConfigAccessor } from "../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import { AgentGuardEngine } from "../Engines/AgentGuardEngine/AgentGuardEngine";
import { EvaluateAdmitAgentActionHandler } from "../Engines/AgentGuardEngine/Handlers/EvaluateAdmitAgentActionHandler";
import type { IAgentGuardEngine } from "../Engines/AgentGuardEngine/IAgentGuardEngine";
import { AdmitAgentActionRequest } from "../Engines/AgentGuardEngine/Requests/AdmitAgentActionRequest";

// The per-token daily caps (SPEC.md §17, D22), reading the same `site_config` and
// `rate_limits` stores the rest of the system uses.
export function createAgentGuardEngine(
  siteConfig: ISiteConfigAccessor,
  rateLimits: IRateLimitAccessor,
): IAgentGuardEngine {
  return new AgentGuardEngine(
    new HandlerResolverBuilder()
      .register(
        AdmitAgentActionRequest,
        new EvaluateAdmitAgentActionHandler(siteConfig, rateLimits),
      )
      .build(),
  );
}
