import { ResponseBase } from "../../../Common/ResponseBase";

// `oauthClientId` is set when the revoked token was a connected app's grant (D25): the
// caller then withdraws the consent at Supabase Auth for that client. It is read from
// the revoked row, never from the request (#88).
export class TokenRevokedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly oauthClientId: string | null,
  ) {
    super(correlationId);
  }
}
