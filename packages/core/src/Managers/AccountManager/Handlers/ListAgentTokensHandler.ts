import type { IAgentTokenAccessor } from "../../../Accessors/AgentTokenAccessor/IAgentTokenAccessor";
import { ListAgentTokensByOwnerRequest } from "../../../Accessors/AgentTokenAccessor/Requests/ListAgentTokensByOwnerRequest";
import { AgentTokensLoadedResponse } from "../../../Accessors/AgentTokenAccessor/Responses/AgentTokensLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { ownProfileSubject } from "../ownProfileSubject";
import { permit } from "../permit";
import type { ListAgentTokensRequest } from "../Requests/ListAgentTokensRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { TokensResponse } from "../Responses/TokensResponse";
import { unavailable } from "../unavailable";

type Result = TokensResponse | ActionForbiddenResponse | AccountUnavailableResponse;

export class ListAgentTokensHandler implements IHandler<ListAgentTokensRequest, Result> {
  constructor(
    private readonly agentTokens: IAgentTokenAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: ListAgentTokensRequest): Promise<Result> {
    const { correlationId, actor } = request;
    const context = { correlationId };

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

    const loaded = await this.agentTokens.load(
      new ListAgentTokensByOwnerRequest(actor.profile.id, context),
    );
    if (loaded instanceof AgentTokensLoadedResponse) {
      return new TokensResponse(correlationId, loaded.tokens);
    }
    return unavailable(correlationId, loaded, "load");
  }
}
