import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// An admin renders every comment's cached HTML again from its markdown, once, after the
// render pipeline changes (#77: code highlighting). Only a body whose HTML changes is
// written.
export class RerenderCommentBodiesRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    context?: RequestContext,
  ) {
    super(context);
  }
}
