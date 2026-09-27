import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

export class SetPresenceSettingRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly visible: boolean,
    context?: RequestContext,
  ) {
    super(context);
  }
}
