import type { AnonymousAuthor } from "../../../Common/AnonymousAuthor";
import { ResponseBase } from "../../../Common/ResponseBase";

export class AnonymousAuthorStoredResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly author: AnonymousAuthor,
  ) {
    super(correlationId);
  }
}
