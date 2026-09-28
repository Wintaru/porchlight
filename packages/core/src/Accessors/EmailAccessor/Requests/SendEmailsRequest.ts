import type { EmailMessage } from "../../../Common/EmailMessage";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Send every message, each to its own recipient, in order. A failure says how many
// from the start went out (EmailAccessFailedResponse.sent): a caller puts back what it
// claimed for the rest and tries those later.
export class SendEmailsRequest extends RequestBase {
  constructor(
    readonly messages: readonly EmailMessage[],
    context?: RequestContext,
  ) {
    super(context);
  }
}
