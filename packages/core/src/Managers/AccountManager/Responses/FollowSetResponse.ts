import { ResponseBase } from "../../../Common/ResponseBase";

// The actor now follows (`true`) or does not follow (`false`) the target.
export class FollowSetResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly following: boolean,
  ) {
    super(correlationId);
  }
}
