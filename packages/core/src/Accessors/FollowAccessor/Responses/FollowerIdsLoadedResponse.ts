import { ResponseBase } from "../../../Common/ResponseBase";

export class FollowerIdsLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly followerIds: readonly string[],
  ) {
    super(correlationId);
  }
}
