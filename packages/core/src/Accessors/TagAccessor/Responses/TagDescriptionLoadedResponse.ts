import { ResponseBase } from "../../../Common/ResponseBase";

export class TagDescriptionLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly descriptionMd: string | null,
  ) {
    super(correlationId);
  }
}
