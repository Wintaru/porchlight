import type { IAgentTokenAccessor } from "../../../Accessors/AgentTokenAccessor/IAgentTokenAccessor";
import { LoadAgentTokenByHashRequest } from "../../../Accessors/AgentTokenAccessor/Requests/LoadAgentTokenByHashRequest";
import { AgentTokenLoadedResponse } from "../../../Accessors/AgentTokenAccessor/Responses/AgentTokenLoadedResponse";
import { AgentTokenNotFoundResponse } from "../../../Accessors/AgentTokenAccessor/Responses/AgentTokenNotFoundResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { AGENT_TOKEN_PREFIX } from "../../../Common/AgentToken";
import type { IHandler } from "../../../Common/IHandler";
import { hashAgentToken } from "../../../Utilities/agent/hashAgentToken";
import { agentActorFor } from "../agentActorFor";
import type { ResolveAgentTokenRequest } from "../Requests/ResolveAgentTokenRequest";
import type { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { AgentActorResponse } from "../Responses/AgentActorResponse";
import { NoAgentActorResponse } from "../Responses/NoAgentActorResponse";
import { unavailable } from "../unavailable";

type Result = AgentActorResponse | NoAgentActorResponse | AccountUnavailableResponse;

// Hash, find, then the shared live/active/stamp checks (agentActorFor). No permission
// check: this is how an actor comes to exist, and it takes no actor. Every "no" is the
// same NoAgentActorResponse, so a caller probing tokens learns nothing from the shape
// of the refusal. Only a personal token's row has a hash, so an OAuth grant can never
// be reached through this door.
export class ResolveAgentTokenHandler implements IHandler<
  ResolveAgentTokenRequest,
  Result
> {
  constructor(
    private readonly agentTokens: IAgentTokenAccessor,
    private readonly profiles: IProfileAccessor,
  ) {}

  async handle(request: ResolveAgentTokenRequest): Promise<Result> {
    const { correlationId, rawToken, timestamp } = request;
    const context = { correlationId, timestamp };
    if (!rawToken.startsWith(AGENT_TOKEN_PREFIX)) {
      return new NoAgentActorResponse(correlationId);
    }

    const loaded = await this.agentTokens.load(
      new LoadAgentTokenByHashRequest(await hashAgentToken(rawToken), context),
    );
    if (loaded instanceof AgentTokenNotFoundResponse) {
      return new NoAgentActorResponse(correlationId);
    }
    if (!(loaded instanceof AgentTokenLoadedResponse)) {
      return unavailable(correlationId, loaded, "load");
    }
    return agentActorFor(loaded.token, this.agentTokens, this.profiles, context);
  }
}
