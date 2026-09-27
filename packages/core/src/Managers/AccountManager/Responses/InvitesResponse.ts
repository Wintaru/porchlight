import type { Invite } from "../../../Common/Invite";
import { ResponseBase } from "../../../Common/ResponseBase";

export class InvitesResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly invites: readonly Invite[],
  ) {
    super(correlationId);
  }
}
