import { ResponseBase } from "../../../Common/ResponseBase";

export class HandleValidResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly handle: string,
  ) {
    super(correlationId);
  }
}
