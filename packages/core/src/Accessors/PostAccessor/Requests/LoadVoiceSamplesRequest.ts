import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A member's most recent published posts written in the editor that no agent ever
// wrote to, newest first, for the voice guide (D22). Title, body and date only.
export class LoadVoiceSamplesRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    readonly limit: number,
    context?: RequestContext,
  ) {
    super(context);
  }
}
