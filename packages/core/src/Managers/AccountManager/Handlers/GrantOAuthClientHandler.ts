import type { IAgentTokenAccessor } from "../../../Accessors/AgentTokenAccessor/IAgentTokenAccessor";
import { LoadLiveOAuthGrantRequest } from "../../../Accessors/AgentTokenAccessor/Requests/LoadLiveOAuthGrantRequest";
import { MarkAgentTokenRevokedRequest } from "../../../Accessors/AgentTokenAccessor/Requests/MarkAgentTokenRevokedRequest";
import { StoreNewAgentTokenRequest } from "../../../Accessors/AgentTokenAccessor/Requests/StoreNewAgentTokenRequest";
import { AgentTokenLoadedResponse } from "../../../Accessors/AgentTokenAccessor/Responses/AgentTokenLoadedResponse";
import { AgentTokenNotFoundResponse } from "../../../Accessors/AgentTokenAccessor/Responses/AgentTokenNotFoundResponse";
import { AgentTokenRevokedResponse } from "../../../Accessors/AgentTokenAccessor/Responses/AgentTokenRevokedResponse";
import { AgentTokenStoredResponse } from "../../../Accessors/AgentTokenAccessor/Responses/AgentTokenStoredResponse";
import { isAgentScope } from "../../../Common/AgentScope";
import { AGENT_TOKEN_NAME_MAX_LENGTH } from "../../../Common/AgentToken";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { isUuid } from "../../../Common/Uuid";
import { ownProfileSubject } from "../ownProfileSubject";
import { permit } from "../permit";
import type { GrantOAuthClientRequest } from "../Requests/GrantOAuthClientRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { GrantRejectedResponse } from "../Responses/GrantRejectedResponse";
import { OAuthClientGrantedResponse } from "../Responses/OAuthClientGrantedResponse";
import { unavailable } from "../unavailable";
import { withDraftScope } from "../withDraftScope";

type Result =
  | OAuthClientGrantedResponse
  | GrantRejectedResponse
  | ActionForbiddenResponse
  | AccountUnavailableResponse;

// What the settings list calls a client that registered with no name.
export const UNNAMED_OAUTH_CLIENT = "Connected app";

// The consent page's approval (D25). The same permission as minting a token, because an
// OAuth grant is one: only the member themself, never an agent. The grant has no
// expiry of its own (Supabase Auth ends the session); the member revokes it in settings.
export class GrantOAuthClientHandler implements IHandler<
  GrantOAuthClientRequest,
  Result
> {
  constructor(
    private readonly agentTokens: IAgentTokenAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: GrantOAuthClientRequest): Promise<Result> {
    const { correlationId, actor, clientId, timestamp } = request;
    const context = { correlationId, timestamp };

    const refused = await permit(
      this.permissions,
      actor,
      "token.manage",
      ownProfileSubject(actor),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    // `permit` above already refused a visitor and an agent; this narrows the type.
    if (actor.kind !== "member") {
      return new AccountUnavailableResponse(
        correlationId,
        `token.manage granted to a ${actor.kind}`,
      );
    }
    if (!isUuid(clientId)) {
      return new GrantRejectedResponse(correlationId, "client", "must be a UUID");
    }
    if (!request.scopes.every(isAgentScope)) {
      return new GrantRejectedResponse(
        correlationId,
        "scopes",
        "must name known scopes only",
      );
    }
    const ownerId = actor.profile.id;

    // Consenting again replaces the grant, so the scopes are the ones just picked.
    const earlier = await this.agentTokens.load(
      new LoadLiveOAuthGrantRequest(ownerId, clientId, context),
    );
    if (earlier instanceof AgentTokenLoadedResponse) {
      const revoked = await this.agentTokens.store(
        new MarkAgentTokenRevokedRequest(earlier.token.id, ownerId, context),
      );
      if (!(revoked instanceof AgentTokenRevokedResponse)) {
        return unavailable(correlationId, revoked, "store");
      }
    } else if (!(earlier instanceof AgentTokenNotFoundResponse)) {
      return unavailable(correlationId, earlier, "load");
    }

    const stored = await this.agentTokens.store(
      new StoreNewAgentTokenRequest(
        {
          ownerId,
          name: grantName(request.clientName),
          credential: { kind: "oauth", clientId },
          scopes: withDraftScope(request.scopes),
          expiresAt: null,
        },
        context,
      ),
    );
    if (stored instanceof AgentTokenStoredResponse) {
      return new OAuthClientGrantedResponse(correlationId, stored.token);
    }
    return unavailable(correlationId, stored, "store");
  }
}

// The client chose its own name at registration, so it is only a label: trimmed, cut to
// the schema's length, and never empty.
function grantName(clientName: string): string {
  // By code point, so a cut never splits an emoji into half a character the schema's
  // length check would then refuse on every consent.
  const name = Array.from(clientName.trim())
    .slice(0, AGENT_TOKEN_NAME_MAX_LENGTH)
    .join("")
    .trim();
  return name === "" ? UNNAMED_OAUTH_CLIENT : name;
}
