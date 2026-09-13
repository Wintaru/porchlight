import { ResponseBase } from "../../../Common/ResponseBase";

export class ImageClassifierAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
