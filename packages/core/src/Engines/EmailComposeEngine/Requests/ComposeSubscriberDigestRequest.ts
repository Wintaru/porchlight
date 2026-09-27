import type { AnnouncedPost } from "../../../Common/AnnouncedPost";
import type { EmailSite } from "../../../Common/EmailSite";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { SubscriberEmailClaim } from "../../../Common/SubscriberEmailClaim";

// A reader's email of new posts, from what the sweep claimed. `posts` are the ones in
// the claim's window and scope, oldest first. `more` says the window held more than an
// email lists: the email then points to the site for the rest.
export class ComposeSubscriberDigestRequest extends RequestBase {
  constructor(
    readonly claim: SubscriberEmailClaim,
    readonly posts: readonly AnnouncedPost[],
    readonly more: boolean,
    readonly site: EmailSite,
    context?: RequestContext,
  ) {
    super(context);
  }
}
