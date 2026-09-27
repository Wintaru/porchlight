import { ResponseBase } from "../../../Common/ResponseBase";

export class InviteCheckedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly live: boolean,
  ) {
    super(correlationId);
  }
}
