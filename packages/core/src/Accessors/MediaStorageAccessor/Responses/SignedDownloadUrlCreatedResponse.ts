import { ResponseBase } from "../../../Common/ResponseBase";

export class SignedDownloadUrlCreatedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly signedUrl: string,
  ) {
    super(correlationId);
  }
}
