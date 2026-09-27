import { ResponseBase } from "../../../Common/ResponseBase";

// A member cannot mute or block themselves, or an erased account.
export class MemberBlockRejectedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: "self" | "erased",
  ) {
    super(correlationId);
  }
}
