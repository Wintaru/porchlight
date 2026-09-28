import { ResponseBase } from "../../../Common/ResponseBase";

export class OpenReportsCountedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly count: number,
  ) {
    super(correlationId);
  }
}
