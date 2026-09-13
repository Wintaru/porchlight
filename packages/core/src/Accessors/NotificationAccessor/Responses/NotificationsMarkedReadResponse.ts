import { ResponseBase } from "../../../Common/ResponseBase";

export class NotificationsMarkedReadResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly count: number,
  ) {
    super(correlationId);
  }
}
