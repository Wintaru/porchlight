import { ResponseBase } from "../../../Common/ResponseBase";

export class QuotaAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
