import type { IHandler } from "../../../Common/IHandler";
import type { FakePresenceState } from "../FakePresenceState";
import type { BroadcastPresenceRequest } from "../Requests/BroadcastPresenceRequest";
import { PresenceAccessFailedResponse } from "../Responses/PresenceAccessFailedResponse";
import { PresenceBroadcastResponse } from "../Responses/PresenceBroadcastResponse";

export class FakeBroadcastPresenceHandler implements IHandler<
  BroadcastPresenceRequest,
  PresenceBroadcastResponse | PresenceAccessFailedResponse
> {
  constructor(private readonly state: FakePresenceState) {}

  handle(
    request: BroadcastPresenceRequest,
  ): Promise<PresenceBroadcastResponse | PresenceAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new PresenceAccessFailedResponse(
          request.correlationId,
          "PRESENCE_FAKE_RESULT=fail",
        ),
      );
    }
    this.state.sent.push({ topic: request.topic, message: request.message });
    return Promise.resolve(new PresenceBroadcastResponse(request.correlationId));
  }
}
