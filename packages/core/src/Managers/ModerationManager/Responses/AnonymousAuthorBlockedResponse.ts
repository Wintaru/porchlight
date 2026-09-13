import { ResponseBase } from "../../../Common/ResponseBase";

export class AnonymousAuthorBlockedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly blockId: string,
  ) {
    super(correlationId);
  }
}
