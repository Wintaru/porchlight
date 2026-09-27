import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Whether the member lets others see them online and typing (#75).
export class LoadPresenceSettingRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
