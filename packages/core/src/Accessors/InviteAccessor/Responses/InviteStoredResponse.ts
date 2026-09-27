import type { Invite } from "../../../Common/Invite";
import { ResponseBase } from "../../../Common/ResponseBase";

export class InviteStoredResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly invite: Invite,
  ) {
    super(correlationId);
  }
}
