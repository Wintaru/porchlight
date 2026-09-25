import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// One member's voice guide (D22). Its own read, not a Profile field: every page loads
// the profile, and only the settings page and the agent door need the guide.
export class LoadVoiceGuideRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
