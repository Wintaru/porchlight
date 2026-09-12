import { ResponseBase } from "../../../Common/ResponseBase";

export class MediaCountResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly count: number,
  ) {
    super(correlationId);
  }
}
