import { ResponseBase } from "../../../Common/ResponseBase";

export class PostSlugTakenResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly slug: string,
  ) {
    super(correlationId);
  }
}
