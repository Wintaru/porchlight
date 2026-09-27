import type { IHandler } from "../../../Common/IHandler";
import type { FakeSubscriberState } from "../FakeSubscriberState";
import type { ClaimSubscriberEmailsRequest } from "../Requests/ClaimSubscriberEmailsRequest";
import { SubscriberAccessFailedResponse } from "../Responses/SubscriberAccessFailedResponse";
import { SubscriberEmailsClaimedResponse } from "../Responses/SubscriberEmailsClaimedResponse";

export class FakeClaimSubscriberEmailsHandler implements IHandler<
  ClaimSubscriberEmailsRequest,
  SubscriberEmailsClaimedResponse | SubscriberAccessFailedResponse
> {
  constructor(private readonly state: FakeSubscriberState) {}

  handle(
    request: ClaimSubscriberEmailsRequest,
  ): Promise<SubscriberEmailsClaimedResponse | SubscriberAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new SubscriberAccessFailedResponse(
          request.correlationId,
          "SUBSCRIBER_FAKE_RESULT=fail",
        ),
      );
    }
    const claims = this.state.due.slice(0, request.limit);
    this.state.due = this.state.due.slice(request.limit);
    return Promise.resolve(
      new SubscriberEmailsClaimedResponse(request.correlationId, claims),
    );
  }
}
