import type { PresenceMessage } from "../../../Common/PresenceMessage";
import type { PresenceTopic } from "../../../Common/PresenceTopic";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// One message to the members listening on `topic`, a `presence:` channel.
export class BroadcastPresenceRequest extends RequestBase {
  constructor(
    readonly topic: PresenceTopic,
    readonly message: PresenceMessage,
    context?: RequestContext,
  ) {
    super(context);
  }
}
