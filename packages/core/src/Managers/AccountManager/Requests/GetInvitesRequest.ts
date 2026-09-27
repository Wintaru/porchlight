import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The site's invite links for the admin page, newest first (#25).
export class GetInvitesRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    context?: RequestContext,
  ) {
    super(context);
  }
}
