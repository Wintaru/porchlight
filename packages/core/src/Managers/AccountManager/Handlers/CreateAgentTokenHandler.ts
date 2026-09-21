import type { IAgentTokenAccessor } from "../../../Accessors/AgentTokenAccessor/IAgentTokenAccessor";
import { StoreNewAgentTokenRequest } from "../../../Accessors/AgentTokenAccessor/Requests/StoreNewAgentTokenRequest";
import { AgentTokenStoredResponse } from "../../../Accessors/AgentTokenAccessor/Responses/AgentTokenStoredResponse";
import { type AgentScope, isAgentScope } from "../../../Common/AgentScope";
import { AGENT_TOKEN_NAME_MAX_LENGTH } from "../../../Common/AgentToken";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { generateAgentToken } from "../../../Utilities/agent/generateAgentToken";
import { hashAgentToken } from "../../../Utilities/agent/hashAgentToken";
import { ownProfileSubject } from "../ownProfileSubject";
import { permit } from "../permit";
import type { CreateAgentTokenRequest } from "../Requests/CreateAgentTokenRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { TokenMintedResponse } from "../Responses/TokenMintedResponse";
import { TokenRejectedResponse } from "../Responses/TokenRejectedResponse";
import { unavailable } from "../unavailable";

type Result =
  | TokenMintedResponse
  | TokenRejectedResponse
  | ActionForbiddenResponse
  | AccountUnavailableResponse;

// Permission, then the field rules, then the mint (SPEC.md §17). The raw token is
// generated here, hashed here, and leaves only in the response: the store never sees
// it and nothing can show it a second time.
export class CreateAgentTokenHandler implements IHandler<
  CreateAgentTokenRequest,
  Result
> {
  constructor(
    private readonly agentTokens: IAgentTokenAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: CreateAgentTokenRequest): Promise<Result> {
    const { correlationId, actor, timestamp } = request;
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

    const rejected = validate(request);
    if (rejected !== undefined) {
      return new TokenRejectedResponse(correlationId, rejected.field, rejected.message);
    }

    const rawToken = generateAgentToken();
    const stored = await this.agentTokens.store(
      new StoreNewAgentTokenRequest(
        {
          ownerId: actor.profile.id,
          name: request.name.trim(),
          tokenHash: await hashAgentToken(rawToken),
          scopes: uniqueScopes(request.scopes),
          expiresAt: request.expiresAt,
        },
        context,
      ),
    );
    if (stored instanceof AgentTokenStoredResponse) {
      return new TokenMintedResponse(correlationId, rawToken, stored.token);
    }
    return unavailable(correlationId, stored, "store");
  }
}

interface FieldError {
  readonly field: TokenRejectedResponse["field"];
  readonly message: string;
}

function validate(request: CreateAgentTokenRequest): FieldError | undefined {
  const name = request.name.trim();
  if (name === "" || name.length > AGENT_TOKEN_NAME_MAX_LENGTH) {
    return {
      field: "name",
      message: `must be 1 to ${String(AGENT_TOKEN_NAME_MAX_LENGTH)} characters`,
    };
  }
  if (request.scopes.length === 0 || !request.scopes.every(isAgentScope)) {
    return { field: "scopes", message: "must name at least one known scope" };
  }
  if (
    request.expiresAt !== null &&
    request.expiresAt.getTime() <= request.timestamp.getTime()
  ) {
    return { field: "expiresAt", message: "must be in the future" };
  }
  return undefined;
}

function uniqueScopes(scopes: readonly AgentScope[]): readonly AgentScope[] {
  return [...new Set(scopes)];
}
