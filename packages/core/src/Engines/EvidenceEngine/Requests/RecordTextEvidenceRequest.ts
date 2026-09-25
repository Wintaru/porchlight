import type { ContentAuthor } from "../../../Common/ContentAuthor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { RequestOrigin } from "../../../Common/RequestOrigin";
import type { TurnstileResult } from "../../../Common/TurnstileResult";

// Record the envelope for one created post or comment. `text` is what the author
// submitted, hashed as it is: a post's title and body, a comment's body. `agentTokenId`
// names the token when an agent wrote it (D22).
export class RecordTextEvidenceRequest extends RequestBase {
  constructor(
    readonly subject: { readonly kind: "post" | "comment"; readonly id: string },
    readonly author: ContentAuthor,
    readonly agentTokenId: string | null,
    readonly origin: RequestOrigin,
    readonly turnstileResult: TurnstileResult,
    readonly text: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
