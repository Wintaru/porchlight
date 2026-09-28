import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { PresenceSignal } from "../../../Common/PresenceMessage";
import type { PresenceTopic } from "../../../Common/PresenceTopic";

// The caller's page reports itself on a presence channel (#81, D26). `memberId` is the
// verified session's user id, never a value from the request body: the member a report
// names is always the caller. The handler reads the profile itself, in the same query
// as the presence setting (#89).
export class AnnouncePresenceRequest extends RequestBase {
  constructor(
    readonly memberId: string,
    readonly topic: PresenceTopic,
    readonly signal: PresenceSignal,
    context?: RequestContext,
  ) {
    super(context);
  }
}
