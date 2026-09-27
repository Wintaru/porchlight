import { ResponseBase } from "../../../Common/ResponseBase";

export class FollowersNotifiedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly count: number,
  ) {
    super(correlationId);
  }
}
