import type { PresenceMessage } from "../../Common/PresenceMessage";
import type { PresenceTopic } from "../../Common/PresenceTopic";

// The fake's channels: every message broadcast, in order, with its topic. `failing`
// makes every call answer PresenceAccessFailedResponse, for the error path.
export class FakePresenceState {
  readonly sent: { readonly topic: PresenceTopic; readonly message: PresenceMessage }[] =
    [];

  constructor(readonly failing = false) {}
}
