import type { IAgentTokenAccessor } from "../../../Accessors/AgentTokenAccessor/IAgentTokenAccessor";
import { LoadAgentTokenByHashRequest } from "../../../Accessors/AgentTokenAccessor/Requests/LoadAgentTokenByHashRequest";
import { TouchAgentTokenRequest } from "../../../Accessors/AgentTokenAccessor/Requests/TouchAgentTokenRequest";
import { AgentTokenLoadedResponse } from "../../../Accessors/AgentTokenAccessor/Responses/AgentTokenLoadedResponse";
import { AgentTokenNotFoundResponse } from "../../../Accessors/AgentTokenAccessor/Responses/AgentTokenNotFoundResponse";
import { AgentTokenTouchedResponse } from "../../../Accessors/AgentTokenAccessor/Responses/AgentTokenTouchedResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadProfileByIdRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadProfileByIdRequest";
import { ProfileLoadedResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileLoadedResponse";
import { ProfileNotFoundResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileNotFoundResponse";
import { AGENT_TOKEN_PREFIX, isAgentTokenLive } from "../../../Common/AgentToken";
import type { IHandler } from "../../../Common/IHandler";
import { hashAgentToken } from "../../../Utilities/agent/hashAgentToken";
import type { ResolveAgentTokenRequest } from "../Requests/ResolveAgentTokenRequest";
import type { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import { AgentActorResponse } from "../Responses/AgentActorResponse";
import { NoAgentActorResponse } from "../Responses/NoAgentActorResponse";
import { unavailable } from "../unavailable";

type Result = AgentActorResponse | NoAgentActorResponse | AccountUnavailableResponse;

// Hash, find, check it is live, load its member, check they are active, stamp
// last_used_at. No permission check: this is how an actor comes to exist, and it takes
// no actor. Every "no" is the same NoAgentActorResponse, so a caller probing tokens
// learns nothing from the shape of the refusal.
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
    const { token } = loaded;
    if (!isAgentTokenLive(token, timestamp)) {
      return new NoAgentActorResponse(correlationId);
    }

    const owner = await this.profiles.load(
      new LoadProfileByIdRequest(token.ownerId, context),
    );
    if (owner instanceof ProfileNotFoundResponse) {
      return new NoAgentActorResponse(correlationId);
    }
    if (!(owner instanceof ProfileLoadedResponse)) {
      return unavailable(correlationId, owner, "load");
    }
    if (owner.profile.status !== "active") {
      return new NoAgentActorResponse(correlationId);
    }

    const touched = await this.agentTokens.store(
      new TouchAgentTokenRequest(token.id, context),
    );
    if (!(touched instanceof AgentTokenTouchedResponse)) {
      return unavailable(correlationId, touched, "store");
    }
    return new AgentActorResponse(correlationId, {
      kind: "agent",
      profile: owner.profile,
      grant: { tokenId: token.id, scopes: token.scopes },
    });
  }
}
