import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The widget's response token and the caller's address, the two fields Cloudflare's
// siteverify endpoint needs (D15). `token` is undefined when the widget never ran (a
// script blocker, or a form replayed without the field): the vendor never sees an
// empty string, and every handler treats a missing token as an outright failure.
export class VerifyTurnstileRequest extends RequestBase {
  constructor(
    readonly token: string | undefined,
    readonly remoteIp: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
