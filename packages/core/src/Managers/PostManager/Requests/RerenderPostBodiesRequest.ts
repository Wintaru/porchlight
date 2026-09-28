import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// An admin renders the posts' cached HTML again from their markdown, after the render
// pipeline changes (#77: code highlighting). Only a body whose HTML changes is written.
// One request reads at most `maxBodies` posts after `afterId` (null for the first),
// so a large site takes several presses (#98, C24).
export class RerenderPostBodiesRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly afterId: string | null,
    readonly maxBodies: number,
    context?: RequestContext,
  ) {
    super(context);
  }
}
