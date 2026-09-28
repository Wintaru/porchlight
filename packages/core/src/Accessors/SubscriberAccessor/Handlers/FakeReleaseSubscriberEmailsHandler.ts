import type { IHandler } from "../../../Common/IHandler";
import type { FakeSubscriberState } from "../FakeSubscriberState";
import type { ReleaseSubscriberEmailsRequest } from "../Requests/ReleaseSubscriberEmailsRequest";
import { SubscriberAccessFailedResponse } from "../Responses/SubscriberAccessFailedResponse";
import { SubscriberEmailsReleasedResponse } from "../Responses/SubscriberEmailsReleasedResponse";

export class FakeReleaseSubscriberEmailsHandler implements IHandler<
  ReleaseSubscriberEmailsRequest,
  SubscriberEmailsReleasedResponse | SubscriberAccessFailedResponse
> {
  constructor(private readonly state: FakeSubscriberState) {}

  handle(
    request: ReleaseSubscriberEmailsRequest,
  ): Promise<SubscriberEmailsReleasedResponse | SubscriberAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new SubscriberAccessFailedResponse(
          request.correlationId,
          "SUBSCRIBER_FAKE_RESULT=fail",
        ),
      );
    }
    this.state.released.push(...request.claims);
    this.state.due.push(...request.claims);
    return Promise.resolve(new SubscriberEmailsReleasedResponse(request.correlationId));
  }
}
