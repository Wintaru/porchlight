import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

export class StorePresenceSettingRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    readonly visible: boolean,
    context?: RequestContext,
  ) {
    super(context);
  }
}
