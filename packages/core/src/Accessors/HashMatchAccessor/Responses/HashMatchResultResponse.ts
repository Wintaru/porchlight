import { ResponseBase } from "../../../Common/ResponseBase";

export class HashMatchResultResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly matched: boolean,
  ) {
    super(correlationId);
  }
}
