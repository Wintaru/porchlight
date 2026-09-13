import { ResponseBase } from "../../../Common/ResponseBase";

export class NotificationsMarkedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly count: number,
  ) {
    super(correlationId);
  }
}
