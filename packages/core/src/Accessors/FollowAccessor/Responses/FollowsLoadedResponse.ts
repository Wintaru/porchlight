import type { Follow } from "../../../Common/Follow";
import { ResponseBase } from "../../../Common/ResponseBase";

export class FollowsLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly follows: readonly Follow[],
  ) {
    super(correlationId);
  }
}
