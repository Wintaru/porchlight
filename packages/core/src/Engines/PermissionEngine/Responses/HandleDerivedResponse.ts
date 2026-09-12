import { ResponseBase } from "../../../Common/ResponseBase";

export class HandleDerivedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly handle: string,
  ) {
    super(correlationId);
  }
}
