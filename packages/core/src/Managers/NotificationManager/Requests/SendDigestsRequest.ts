import type { EmailSite } from "../../../Common/EmailSite";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// One run of the email sweep (#22): every digest and queue email that is due goes out.
// No actor: the Client's scheduled route authenticates the scheduler itself, and a
// member never starts a sweep.
export class SendDigestsRequest extends RequestBase {
  constructor(
    readonly site: EmailSite,
    context?: RequestContext,
  ) {
    super(context);
  }
}
