import { ResponseBase } from "../../../Common/ResponseBase";

export class ViewableImageResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly bytes: Uint8Array,
    readonly mimeType: string,
  ) {
    super(correlationId);
  }
}
