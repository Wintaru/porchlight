import { ResponseBase } from "../../../Common/ResponseBase";

export class EmailsSentResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly count: number,
  ) {
    super(correlationId);
  }
}
