import { ResponseBase } from "../../../Common/ResponseBase";

export class MediaAssetAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
