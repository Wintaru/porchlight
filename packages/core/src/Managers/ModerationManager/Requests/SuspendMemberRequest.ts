import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

export class SuspendMemberRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly profileId: string,
    readonly reason: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
