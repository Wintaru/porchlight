import type { IAgentTokenAccessor } from "../../../Accessors/AgentTokenAccessor/IAgentTokenAccessor";
import { LoadLiveOAuthGrantRequest } from "../../../Accessors/AgentTokenAccessor/Requests/LoadLiveOAuthGrantRequest";
import { AgentTokenLoadedResponse } from "../../../Accessors/AgentTokenAccessor/Responses/AgentTokenLoadedResponse";
import { AgentTokenNotFoundResponse } from "../../../Accessors/AgentTokenAccessor/Responses/AgentTokenNotFoundResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import type { IHandler } from "../../../Common/IHandler";
import { isUuid } from "../../../Common/Uuid";
import { agentActorFor } from "../agentActorFor";
import type { ResolveOAuthAgentRequest } from "../Requests/ResolveOAuthAgentRequest";
import type { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { AgentActorResponse } from "../Responses/AgentActorResponse";
import { NoAgentActorResponse } from "../Responses/NoAgentActorResponse";
import { unavailable } from "../unavailable";

type Result = AgentActorResponse | NoAgentActorResponse | AccountUnavailableResponse;

// How far Auth's clock may run behind the database's. The grant is stored before Auth
// approves, so a token for the current grant is always issued after it; the margin is
// only for clock drift between the two servers.
export const OAUTH_CLOCK_SKEW_MS = 5000;

// An OAuth access token becomes an agent only through a grant the member made on the
// consent page (D25). Supabase Auth's token proves who and which client; the scopes are
// Porchlight's, from the grant row, so an OAuth token can never hold more than the
// member picked. No live grant (never consented here, or revoked in settings) is the
// same NoAgentActorResponse as an unknown `plt_` token.
export class ResolveOAuthAgentHandler implements IHandler<
  ResolveOAuthAgentRequest,
  Result
> {
  constructor(
    private readonly agentTokens: IAgentTokenAccessor,
    private readonly profiles: IProfileAccessor,
  ) {}

  async handle(request: ResolveOAuthAgentRequest): Promise<Result> {
    const { correlationId, profileId, clientId, issuedAt, timestamp } = request;
    const context = { correlationId, timestamp };
    if (!isUuid(profileId) || !isUuid(clientId)) {
      return new NoAgentActorResponse(correlationId);
    }

    const loaded = await this.agentTokens.load(
      new LoadLiveOAuthGrantRequest(profileId, clientId, context),
    );
    if (loaded instanceof AgentTokenNotFoundResponse) {
      return new NoAgentActorResponse(correlationId);
    }
    if (!(loaded instanceof AgentTokenLoadedResponse)) {
      return unavailable(correlationId, loaded, "load");
    }
    // A token Auth issued under an earlier grant (revoked, then approved again) stays
    // dead: revoking means its tokens stop, not only until the next consent.
    if (issuedAt.getTime() < loaded.token.createdAt.getTime() - OAUTH_CLOCK_SKEW_MS) {
      return new NoAgentActorResponse(correlationId);
    }
    return agentActorFor(loaded.token, this.agentTokens, this.profiles, context);
  }
}
