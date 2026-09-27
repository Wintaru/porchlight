import type { EmailMessage } from "../../../Common/EmailMessage";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Send every message, each to its own recipient. All go or none are reported sent: a
// caller that sees a failure puts back what it claimed and tries the whole set later.
export class SendEmailsRequest extends RequestBase {
  constructor(
    readonly messages: readonly EmailMessage[],
    context?: RequestContext,
  ) {
    super(context);
  }
}
