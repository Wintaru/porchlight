import type { ImageClassification } from "../../../Common/ImageClassification";
import { ResponseBase } from "../../../Common/ResponseBase";

export class ImageClassifiedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly classification: ImageClassification,
  ) {
    super(correlationId);
  }
}
