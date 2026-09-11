import type { IHandler } from "../../../Common/IHandler";
import type { FakeGreetingState } from "../FakeGreetingState";
import type { LoadGreetingRequest } from "../Requests/LoadGreetingRequest";
import { GreetingAccessFailedResponse } from "../Responses/GreetingAccessFailedResponse";
import { GreetingLoadedResponse } from "../Responses/GreetingLoadedResponse";

export class FakeLoadGreetingHandler implements IHandler<
  LoadGreetingRequest,
  GreetingLoadedResponse | GreetingAccessFailedResponse
> {
  constructor(private readonly state: FakeGreetingState) {}

  handle(
    request: LoadGreetingRequest,
  ): Promise<GreetingLoadedResponse | GreetingAccessFailedResponse> {
    if (this.state.result === "fail") {
      return Promise.resolve(
        new GreetingAccessFailedResponse(
          request.correlationId,
          "GREETING_FAKE_RESULT=fail",
        ),
      );
    }
    return Promise.resolve(
      new GreetingLoadedResponse(request.correlationId, this.state.greeting),
    );
  }
}
