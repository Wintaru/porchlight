import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A video, which is too large to send as bytes (#21): the provider fetches it from
// `url`, a short-lived signed link to the quarantine object, and checks its frames.
export class MatchMediaUrlRequest extends RequestBase {
  constructor(
    readonly url: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
