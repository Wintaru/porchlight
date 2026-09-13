import { ResponseBase } from "../../../Common/ResponseBase";

export class AuditEventRecordedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly id: number,
  ) {
    super(correlationId);
  }
}
