import type { AnonymousStatusItem } from "../../../Common/AnonymousStatusItem";
import { ResponseBase } from "../../../Common/ResponseBase";

// The status page's rows for one cookie or code. Empty, not an error, when the text
// matches no author: a stale or cleared cookie looks like "nothing yet" to a visitor.
export class AnonymousStatusResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly items: readonly AnonymousStatusItem[],
  ) {
    super(correlationId);
  }
}
