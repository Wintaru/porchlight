import { ResponseBase } from "../../../Common/ResponseBase";

export class EmailAvailabilityResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly enabled: boolean,
  ) {
    super(correlationId);
  }
}
