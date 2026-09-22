import type { Actor } from "../../Common/Actor";
import type { RequestContext } from "../../Common/RequestContext";
import type { AgentGuardAction } from "../../Engines/AgentGuardEngine/AgentGuardAction";
import type { IAgentGuardEngine } from "../../Engines/AgentGuardEngine/IAgentGuardEngine";
import { AdmitAgentActionRequest } from "../../Engines/AgentGuardEngine/Requests/AdmitAgentActionRequest";
import { AgentActionAdmittedResponse } from "../../Engines/AgentGuardEngine/Responses/AgentActionAdmittedResponse";
import { AgentActionDeniedResponse } from "../../Engines/AgentGuardEngine/Responses/AgentActionDeniedResponse";
import { PostRateLimitedResponse } from "./Responses/PostRateLimitedResponse";
import type { PostUnavailableResponse } from "./Responses/PostUnavailableResponse";
import { unavailable } from "./unavailable";

// The daily cap on an agent token (SPEC.md §17). Answers `undefined` for a person, who
// has no cap, and for an agent still inside its allowance; otherwise the response the
// handler returns as it is. Counting happens here, so a refused action is counted too:
// the cap is on attempts, which is what stops a loop.
export async function admitAgent(
  guard: IAgentGuardEngine,
  actor: Actor,
  action: AgentGuardAction,
  context: Required<Pick<RequestContext, "correlationId" | "timestamp">>,
): Promise<PostRateLimitedResponse | PostUnavailableResponse | undefined> {
  if (actor.kind !== "agent") {
    return undefined;
  }
  const verdict = await guard.evaluate(
    new AdmitAgentActionRequest(actor.grant.tokenId, action, context),
  );
  if (verdict instanceof AgentActionAdmittedResponse) {
    return undefined;
  }
  if (verdict instanceof AgentActionDeniedResponse) {
    return new PostRateLimitedResponse(
      context.correlationId,
      verdict.limit,
      verdict.resetAt,
    );
  }
  return unavailable(context.correlationId, verdict, "guard.evaluate");
}
