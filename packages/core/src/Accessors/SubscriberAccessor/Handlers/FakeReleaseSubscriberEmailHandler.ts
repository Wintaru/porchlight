import type { IHandler } from "../../../Common/IHandler";
import type { FakeSubscriberState } from "../FakeSubscriberState";
import type { ReleaseSubscriberEmailRequest } from "../Requests/ReleaseSubscriberEmailRequest";
import { SubscriberAccessFailedResponse } from "../Responses/SubscriberAccessFailedResponse";
import { SubscriberEmailReleasedResponse } from "../Responses/SubscriberEmailReleasedResponse";

export class FakeReleaseSubscriberEmailHandler implements IHandler<
  ReleaseSubscriberEmailRequest,
  SubscriberEmailReleasedResponse | SubscriberAccessFailedResponse
> {
  constructor(private readonly state: FakeSubscriberState) {}

  handle(
    request: ReleaseSubscriberEmailRequest,
  ): Promise<SubscriberEmailReleasedResponse | SubscriberAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new SubscriberAccessFailedResponse(
          request.correlationId,
          "SUBSCRIBER_FAKE_RESULT=fail",
        ),
      );
    }
    this.state.released.push(request.claim);
    this.state.due.push(request.claim);
    return Promise.resolve(new SubscriberEmailReleasedResponse(request.correlationId));
  }
}
