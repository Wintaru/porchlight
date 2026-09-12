import { ResponseBase } from "../../../Common/ResponseBase";

export class MarkdownRenderedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly html: string,
  ) {
    super(correlationId);
  }
}
