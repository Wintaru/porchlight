import { ResponseBase } from "../../../Common/ResponseBase";

// A member cannot follow themselves, or an author or tag that is not there.
export class FollowRejectedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: "self" | "no-such-target",
  ) {
    super(correlationId);
  }
}
