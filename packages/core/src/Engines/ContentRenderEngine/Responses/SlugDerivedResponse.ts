import { ResponseBase } from "../../../Common/ResponseBase";

export class SlugDerivedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly slug: string,
  ) {
    super(correlationId);
  }
}
