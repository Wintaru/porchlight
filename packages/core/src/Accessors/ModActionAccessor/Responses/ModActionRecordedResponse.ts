import { ResponseBase } from "../../../Common/ResponseBase";

export class ModActionRecordedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly id: string,
  ) {
    super(correlationId);
  }
}
