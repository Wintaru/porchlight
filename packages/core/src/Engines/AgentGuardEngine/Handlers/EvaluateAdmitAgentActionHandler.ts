import type { IRateLimitAccessor } from "../../../Accessors/RateLimitAccessor/IRateLimitAccessor";
import { BumpRateLimitRequest } from "../../../Accessors/RateLimitAccessor/Requests/BumpRateLimitRequest";
import { RateLimitBumpedResponse } from "../../../Accessors/RateLimitAccessor/Responses/RateLimitBumpedResponse";
import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadAgentLimitsRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAgentLimitsRequest";
import { AgentLimitsLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AgentLimitsLoadedResponse";
import type { AgentLimits } from "../../../Common/AgentLimits";
import type { IHandler } from "../../../Common/IHandler";
import type { AdmitAgentActionRequest } from "../Requests/AdmitAgentActionRequest";
import { AgentActionAdmittedResponse } from "../Responses/AgentActionAdmittedResponse";
import { AgentActionDeniedResponse } from "../Responses/AgentActionDeniedResponse";
import { AgentGuardUnavailableResponse } from "../Responses/AgentGuardUnavailableResponse";

type Result =
  AgentActionAdmittedResponse | AgentActionDeniedResponse | AgentGuardUnavailableResponse;

const MS_PER_DAY = 86_400_000;

// Read the cap, count the action, compare (SPEC.md §17, D22). The bump comes before
// the comparison, the same order the anonymous guard uses: the store's upsert returns
// the new count in one round trip, so two tool calls in the same second cannot both
// read "four so far" and both proceed.
export class EvaluateAdmitAgentActionHandler implements IHandler<
  AdmitAgentActionRequest,
  Result
> {
  constructor(
    private readonly siteConfig: ISiteConfigAccessor,
    private readonly rateLimits: IRateLimitAccessor,
  ) {}

  async handle(request: AdmitAgentActionRequest): Promise<Result> {
    const { correlationId, tokenId, action, timestamp } = request;
    const context = { correlationId, timestamp };

    const loaded = await this.siteConfig.load(new LoadAgentLimitsRequest(context));
    if (!(loaded instanceof AgentLimitsLoadedResponse)) {
      return unavailable(correlationId, loaded, "siteConfig.load");
    }
    const limit = capFor(loaded.limits, action);
    const windowStart = dayFloor(timestamp);
    if (limit === 0) {
      return new AgentActionDeniedResponse(correlationId, 0, nextDay(windowStart));
    }

    const bumped = await this.rateLimits.store(
      new BumpRateLimitRequest(`token:${tokenId}`, action, windowStart, context),
    );
    if (!(bumped instanceof RateLimitBumpedResponse)) {
      return unavailable(correlationId, bumped, "rateLimits.store");
    }
    return bumped.count > limit
      ? new AgentActionDeniedResponse(correlationId, limit, nextDay(windowStart))
      : new AgentActionAdmittedResponse(correlationId);
  }
}

function capFor(limits: AgentLimits, action: AdmitAgentActionRequest["action"]): number {
  return action === "agent:draft" ? limits.draftsPerDay : limits.publishesPerDay;
}

// The UTC midnight this moment belongs to: the window every count for the day shares.
function dayFloor(at: Date): Date {
  return new Date(Math.floor(at.getTime() / MS_PER_DAY) * MS_PER_DAY);
}

function nextDay(windowStart: Date): Date {
  return new Date(windowStart.getTime() + MS_PER_DAY);
}

function unavailable(
  correlationId: string,
  response: { constructor: { name: string } },
  method: string,
): AgentGuardUnavailableResponse {
  const reason =
    "reason" in response && typeof response.reason === "string"
      ? response.reason
      : `unexpected ${response.constructor.name} from ${method}`;
  return new AgentGuardUnavailableResponse(correlationId, reason);
}
