import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The caller's own choice to be seen online and typing (#75).
export class GetPresenceSettingRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    context?: RequestContext,
  ) {
    super(context);
  }
}
