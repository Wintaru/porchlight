import { ResponseBase } from "../../../Common/ResponseBase";

export class ReportsResolvedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly count: number,
  ) {
    super(correlationId);
  }
}
