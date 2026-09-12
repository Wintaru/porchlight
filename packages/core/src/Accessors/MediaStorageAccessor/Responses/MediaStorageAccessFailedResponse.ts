import { ResponseBase } from "../../../Common/ResponseBase";

export class MediaStorageAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
