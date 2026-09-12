import { ResponseBase } from "../../../Common/ResponseBase";

export class BlockAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
