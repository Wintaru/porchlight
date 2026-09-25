import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Replace the actor's own voice guide with `guideMd`. Blank text clears it. An agent
// needs the `voice:write` scope (SPEC.md §17).
export class UpdateVoiceGuideRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly guideMd: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
