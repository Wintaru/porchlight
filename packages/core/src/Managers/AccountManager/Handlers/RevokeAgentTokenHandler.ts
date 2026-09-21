import type { IAgentTokenAccessor } from "../../../Accessors/AgentTokenAccessor/IAgentTokenAccessor";
import { MarkAgentTokenRevokedRequest } from "../../../Accessors/AgentTokenAccessor/Requests/MarkAgentTokenRevokedRequest";
import { AgentTokenNotFoundResponse } from "../../../Accessors/AgentTokenAccessor/Responses/AgentTokenNotFoundResponse";
import { AgentTokenRevokedResponse } from "../../../Accessors/AgentTokenAccessor/Responses/AgentTokenRevokedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { ownProfileSubject } from "../ownProfileSubject";
import { permit } from "../permit";
import type { RevokeAgentTokenRequest } from "../Requests/RevokeAgentTokenRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { NoSuchTokenResponse } from "../Responses/NoSuchTokenResponse";
import { TokenRevokedResponse } from "../Responses/TokenRevokedResponse";
import { unavailable } from "../unavailable";

type Result =
  | TokenRevokedResponse
  | NoSuchTokenResponse
  | ActionForbiddenResponse
  | AccountUnavailableResponse;

// The owner is part of the store's match, so another member's token id answers
// NoSuchToken without a load, and a revoke can never land on someone else's row.
export class RevokeAgentTokenHandler implements IHandler<
  RevokeAgentTokenRequest,
  Result
> {
  constructor(
    private readonly agentTokens: IAgentTokenAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: RevokeAgentTokenRequest): Promise<Result> {
    const { correlationId, actor, tokenId, timestamp } = request;
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
    if (actor.kind !== "member") {
      return new AccountUnavailableResponse(
        correlationId,
        `token.manage granted to a ${actor.kind}`,
      );
    }

    const revoked = await this.agentTokens.store(
      new MarkAgentTokenRevokedRequest(tokenId, actor.profile.id, context),
    );
    if (revoked instanceof AgentTokenRevokedResponse) {
      return new TokenRevokedResponse(correlationId);
    }
    if (revoked instanceof AgentTokenNotFoundResponse) {
      return new NoSuchTokenResponse(correlationId);
    }
    return unavailable(correlationId, revoked, "store");
  }
}
