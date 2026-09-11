import { describe, expect, test } from "vitest";

import type { IGreetingAccessor } from "../../Accessors/GreetingAccessor/IGreetingAccessor";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import { UnhandledRequestResponse } from "../../Common/UnhandledRequestResponse";
import { GetGreetingHandler } from "./Handlers/GetGreetingHandler";
import { SetGreetingHandler } from "./Handlers/SetGreetingHandler";
import { GetGreetingRequest } from "./Requests/GetGreetingRequest";
import { SetGreetingRequest } from "./Requests/SetGreetingRequest";
import { GreetingUnavailableResponse } from "./Responses/GreetingUnavailableResponse";

// An accessor whose resolvers know none of the greeting requests. The handlers must turn
// that into GreetingUnavailableResponse rather than leak a Common type to the Client.
class UnwiredGreetingAccessor implements IGreetingAccessor {
  store(request: RequestBase): Promise<ResponseBase> {
    return Promise.resolve(new UnhandledRequestResponse(request.correlationId, "Store"));
  }

  load(request: RequestBase): Promise<ResponseBase> {
    return Promise.resolve(new UnhandledRequestResponse(request.correlationId, "Load"));
  }
}

describe("GreetingManager handlers", () => {
  const accessor = new UnwiredGreetingAccessor();

  test("SetGreetingHandler reports an unexpected accessor response as unavailable", async () => {
    const response = await new SetGreetingHandler(accessor).handle(
      new SetGreetingRequest("x"),
    );

    expect(response).toBeInstanceOf(GreetingUnavailableResponse);
    expect(response).toMatchObject({
      reason: "unexpected UnhandledRequestResponse from store",
    });
  });

  test("GetGreetingHandler reports an unexpected accessor response as unavailable", async () => {
    const response = await new GetGreetingHandler(accessor).handle(
      new GetGreetingRequest(),
    );

    expect(response).toBeInstanceOf(GreetingUnavailableResponse);
    expect(response).toMatchObject({
      reason: "unexpected UnhandledRequestResponse from load",
    });
  });
});
