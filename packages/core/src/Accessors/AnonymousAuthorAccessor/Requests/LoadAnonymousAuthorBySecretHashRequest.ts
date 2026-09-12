import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Finds the author behind a cookie or a claim code, already hashed at the boundary.
export class LoadAnonymousAuthorBySecretHashRequest extends RequestBase {
  constructor(
    readonly secretHash: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
