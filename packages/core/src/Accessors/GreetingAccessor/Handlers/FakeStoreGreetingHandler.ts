import type { IHandler } from "../../../Common/IHandler";
import type { FakeGreetingState } from "../FakeGreetingState";
import type { StoreGreetingRequest } from "../Requests/StoreGreetingRequest";
import { GreetingAccessFailedResponse } from "../Responses/GreetingAccessFailedResponse";
import { GreetingStoredResponse } from "../Responses/GreetingStoredResponse";

export class FakeStoreGreetingHandler implements IHandler<
  StoreGreetingRequest,
  GreetingStoredResponse | GreetingAccessFailedResponse
> {
  constructor(private readonly state: FakeGreetingState) {}

  handle(
    request: StoreGreetingRequest,
  ): Promise<GreetingStoredResponse | GreetingAccessFailedResponse> {
    if (this.state.result === "fail") {
      return Promise.resolve(
        new GreetingAccessFailedResponse(
          request.correlationId,
          "GREETING_FAKE_RESULT=fail",
        ),
      );
    }
    this.state.greeting = request.greeting;
    return Promise.resolve(
      new GreetingStoredResponse(request.correlationId, this.state.greeting),
    );
  }
}
