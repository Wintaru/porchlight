import { ResponseBase } from "../../../Common/ResponseBase";

export class ProfileCountResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly count: number,
  ) {
    super(correlationId);
  }
}
