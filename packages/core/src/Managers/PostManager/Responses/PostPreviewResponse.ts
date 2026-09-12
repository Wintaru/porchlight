import { ResponseBase } from "../../../Common/ResponseBase";

// The sanitized HTML for a body that is not saved yet.
export class PostPreviewResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly bodyHtml: string,
  ) {
    super(correlationId);
  }
}
