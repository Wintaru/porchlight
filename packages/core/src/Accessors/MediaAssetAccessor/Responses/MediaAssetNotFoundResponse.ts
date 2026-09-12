import { ResponseBase } from "../../../Common/ResponseBase";

export class MediaAssetNotFoundResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly id: string,
  ) {
    super(correlationId);
  }
}
