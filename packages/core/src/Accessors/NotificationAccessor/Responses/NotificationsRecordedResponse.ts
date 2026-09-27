import { ResponseBase } from "../../../Common/ResponseBase";

export class NotificationsRecordedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly count: number,
  ) {
    super(correlationId);
  }
}
