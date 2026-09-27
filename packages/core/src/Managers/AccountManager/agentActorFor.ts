import type { IAgentTokenAccessor } from "../../Accessors/AgentTokenAccessor/IAgentTokenAccessor";
import { TouchAgentTokenRequest } from "../../Accessors/AgentTokenAccessor/Requests/TouchAgentTokenRequest";
import { AgentTokenTouchedResponse } from "../../Accessors/AgentTokenAccessor/Responses/AgentTokenTouchedResponse";
import type { IProfileAccessor } from "../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadProfileByIdRequest } from "../../Accessors/ProfileAccessor/Requests/LoadProfileByIdRequest";
import { ProfileLoadedResponse } from "../../Accessors/ProfileAccessor/Responses/ProfileLoadedResponse";
import { ProfileNotFoundResponse } from "../../Accessors/ProfileAccessor/Responses/ProfileNotFoundResponse";
import { type AgentToken, isAgentTokenLive } from "../../Common/AgentToken";
import type { RequestContext } from "../../Common/RequestContext";
import type { AccountUnavailableResponse } from "./Responses/AccountUnavailableResponse";
import { AgentActorResponse } from "./Responses/AgentActorResponse";
import { NoAgentActorResponse } from "./Responses/NoAgentActorResponse";
import { unavailable } from "./unavailable";

// `last_used_at` is stamped at most this often: the settings page shows the day, not
// the second, and an agent's session is many tool calls, not one.
export const LAST_USED_STAMP_INTERVAL_MS = 5 * 60 * 1000;

// The second half of every agent resolve, for a `plt_` token and an OAuth grant alike
// (D22, D25): check the row is live, load its member, check they are active, stamp
// last_used_at, and build the actor. A failed stamp is a failed resolve, on purpose:
// the store that could not take a write is the store the next tool call needs, and a
// door that half-works is harder to reason about than one that is shut.
export async function agentActorFor(
  token: AgentToken,
  agentTokens: IAgentTokenAccessor,
  profiles: IProfileAccessor,
  context: Required<RequestContext>,
): Promise<AgentActorResponse | NoAgentActorResponse | AccountUnavailableResponse> {
  const { correlationId, timestamp } = context;
  if (!isAgentTokenLive(token, timestamp)) {
    return new NoAgentActorResponse(correlationId);
  }

  const owner = await profiles.load(new LoadProfileByIdRequest(token.ownerId, context));
  if (owner instanceof ProfileNotFoundResponse) {
    return new NoAgentActorResponse(correlationId);
  }
  if (!(owner instanceof ProfileLoadedResponse)) {
    return unavailable(correlationId, owner, "load");
  }
  if (owner.profile.status !== "active") {
    return new NoAgentActorResponse(correlationId);
  }

  if (
    token.lastUsedAt === null ||
    timestamp.getTime() - token.lastUsedAt.getTime() >= LAST_USED_STAMP_INTERVAL_MS
  ) {
    const touched = await agentTokens.store(
      new TouchAgentTokenRequest(token.id, context),
    );
    if (!(touched instanceof AgentTokenTouchedResponse)) {
      return unavailable(correlationId, touched, "store");
    }
  }
  return new AgentActorResponse(correlationId, {
    kind: "agent",
    profile: owner.profile,
    grant: { tokenId: token.id, scopes: token.scopes },
  });
}
