import { ResponseBase } from "../../../Common/ResponseBase";

// `html` is empty when the tag has no description.
export class TagDescriptionResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly descriptionMd: string,
    readonly html: string,
  ) {
    super(correlationId);
  }
}
