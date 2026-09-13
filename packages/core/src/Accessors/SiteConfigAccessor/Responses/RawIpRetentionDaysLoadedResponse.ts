import { ResponseBase } from "../../../Common/ResponseBase";

export class RawIpRetentionDaysLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly days: number,
  ) {
    super(correlationId);
  }
}
