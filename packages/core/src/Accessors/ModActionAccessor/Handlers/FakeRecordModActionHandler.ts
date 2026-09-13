import type { IHandler } from "../../../Common/IHandler";
import type { FakeModActionState } from "../FakeModActionState";
import type { RecordModActionRequest } from "../Requests/RecordModActionRequest";
import { ModActionAccessFailedResponse } from "../Responses/ModActionAccessFailedResponse";
import { ModActionRecordedResponse } from "../Responses/ModActionRecordedResponse";

export class FakeRecordModActionHandler implements IHandler<
  RecordModActionRequest,
  ModActionRecordedResponse | ModActionAccessFailedResponse
> {
  constructor(private readonly state: FakeModActionState) {}

  handle(
    request: RecordModActionRequest,
  ): Promise<ModActionRecordedResponse | ModActionAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new ModActionAccessFailedResponse(
          request.correlationId,
          "MOD_ACTION_FAKE_RESULT=fail",
        ),
      );
    }
    const { actorId, action, target, reason, timestamp } = request;
    const id = globalThis.crypto.randomUUID();
    this.state.actions.push({
      id,
      actorId,
      action,
      target,
      reason,
      createdAt: timestamp,
    });
    return Promise.resolve(new ModActionRecordedResponse(request.correlationId, id));
  }
}
