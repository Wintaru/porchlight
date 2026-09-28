import { ResponseBase } from "../../../Common/ResponseBase";

// `oauthClientId` is the revoked row's OAuth client, or null for a personal token. It
// comes from the row, so the caller never takes it from the form that asked (#88).
export class AgentTokenRevokedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly oauthClientId: string | null,
  ) {
    super(correlationId);
  }
}
