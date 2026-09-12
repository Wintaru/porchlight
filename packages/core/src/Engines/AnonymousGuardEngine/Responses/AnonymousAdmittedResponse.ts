import type { AnonymousAuthor } from "../../../Common/AnonymousAuthor";
import { ResponseBase } from "../../../Common/ResponseBase";

// Every guard passed. secret is the cookie value the Client must set: the one it was
// handed back on a returning write, or a freshly generated one on a first write, when
// isNewAuthor also says to show the claim code once.
export class AnonymousAdmittedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly author: AnonymousAuthor,
    readonly secret: string,
    readonly isNewAuthor: boolean,
  ) {
    super(correlationId);
  }
}
