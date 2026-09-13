import { ResponseBase } from "../../../Common/ResponseBase";

export class HashMatchAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
