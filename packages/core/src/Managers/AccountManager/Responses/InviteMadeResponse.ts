import type { Invite } from "../../../Common/Invite";
import { ResponseBase } from "../../../Common/ResponseBase";

// The new link and its token, shown to the admin once. Only the token's hash is kept.
export class InviteMadeResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly invite: Invite,
    readonly token: string,
  ) {
    super(correlationId);
  }
}
