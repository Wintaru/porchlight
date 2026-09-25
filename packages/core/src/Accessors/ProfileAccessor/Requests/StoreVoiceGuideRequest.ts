import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Replace one member's voice guide. `null` clears it.
export class StoreVoiceGuideRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    readonly guideMd: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
