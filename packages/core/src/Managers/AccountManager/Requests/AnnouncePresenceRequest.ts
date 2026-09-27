import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { PresenceSignal } from "../../../Common/PresenceMessage";
import type { PresenceTopic } from "../../../Common/PresenceTopic";

// The caller's page reports itself on a presence channel (#81, D26). The member it
// names is always the caller: the request carries no member id.
export class AnnouncePresenceRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly topic: PresenceTopic,
    readonly signal: PresenceSignal,
    context?: RequestContext,
  ) {
    super(context);
  }
}
