import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A video, which is too large to hold in memory (#21): `url` is a short-lived signed
// link to the quarantine object, which the handler streams to the provider.
export class MatchMediaUrlRequest extends RequestBase {
  constructor(
    readonly url: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
