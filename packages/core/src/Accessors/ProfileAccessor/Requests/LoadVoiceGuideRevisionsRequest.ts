import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A member's earlier voice guides, newest first (#32). The store keeps at most 50.
export class LoadVoiceGuideRevisionsRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
