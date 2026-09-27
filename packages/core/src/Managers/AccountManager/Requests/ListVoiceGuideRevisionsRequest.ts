import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The caller's own earlier voice guides, newest first (#32).
export class ListVoiceGuideRevisionsRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    context?: RequestContext,
  ) {
    super(context);
  }
}
