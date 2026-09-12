import { describe, expect, test } from "vitest";

import { DEFAULT_GREETING } from "../Accessors/GreetingAccessor/FakeGreetingState";
import { UnhandledRequestResponse } from "../Common/UnhandledRequestResponse";
import { GetGreetingRequest } from "../Managers/GreetingManager/Requests/GetGreetingRequest";
import { SetGreetingRequest } from "../Managers/GreetingManager/Requests/SetGreetingRequest";
import { GreetingResponse } from "../Managers/GreetingManager/Responses/GreetingResponse";
import { GreetingUnavailableResponse } from "../Managers/GreetingManager/Responses/GreetingUnavailableResponse";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV } from "./FakeEnvironment.test-helper";

// These tests go through the real wiring, so they cover the Manager, its handlers, the
// fake accessor and the env parsing together. A real Manager gets the same treatment.
describe("DependencyContainer", () => {
  test("an empty environment selects the healthy fake", async () => {
    const { greetingManager } = new DependencyContainer(FAKE_ENV);

    const response = await greetingManager.query(new GetGreetingRequest());

    expect(response).toBeInstanceOf(GreetingResponse);
    expect(response).toMatchObject({ greeting: DEFAULT_GREETING });
  });

  test("a set greeting comes back from the next get", async () => {
    const { greetingManager } = new DependencyContainer(FAKE_ENV);

    const set = await greetingManager.execute(
      new SetGreetingRequest("Evening, neighbor"),
    );
    const get = await greetingManager.query(new GetGreetingRequest());

    expect(set).toBeInstanceOf(GreetingResponse);
    expect(get).toMatchObject({ greeting: "Evening, neighbor" });
  });

  test("the response carries the request's correlation id", async () => {
    const { greetingManager } = new DependencyContainer(FAKE_ENV);
    const request = new GetGreetingRequest({ correlationId: "fixed-id" });

    await expect(greetingManager.query(request)).resolves.toMatchObject({
      correlationId: "fixed-id",
    });
  });

  test("GREETING_FAKE_RESULT=fail turns both paths into GreetingUnavailableResponse", async () => {
    const { greetingManager } = new DependencyContainer({
      ...FAKE_ENV,
      GREETING_FAKE_RESULT: "fail",
    });

    const set = await greetingManager.execute(new SetGreetingRequest("x"));
    const get = await greetingManager.query(new GetGreetingRequest());

    expect(set).toBeInstanceOf(GreetingUnavailableResponse);
    expect(get).toBeInstanceOf(GreetingUnavailableResponse);
    expect(set).toMatchObject({ reason: "GREETING_FAKE_RESULT=fail" });
  });

  test("a query request sent to execute is unhandled, and the reverse", async () => {
    const { greetingManager } = new DependencyContainer(FAKE_ENV);

    await expect(
      greetingManager.execute(new GetGreetingRequest()),
    ).resolves.toBeInstanceOf(UnhandledRequestResponse);
    await expect(
      greetingManager.query(new SetGreetingRequest("x")),
    ).resolves.toBeInstanceOf(UnhandledRequestResponse);
  });

  test("an unknown provider fails at construction", () => {
    expect(
      () => new DependencyContainer({ ...FAKE_ENV, GREETING_PROVIDER: "supabase" }),
    ).toThrow("GREETING_PROVIDER=supabase is not a known provider");
  });

  test("an unknown fake result fails at construction", () => {
    expect(
      () => new DependencyContainer({ ...FAKE_ENV, GREETING_FAKE_RESULT: "flaky" }),
    ).toThrow("GREETING_FAKE_RESULT=flaky is not a known result");
  });

  test("two containers do not share fake state", async () => {
    const first = new DependencyContainer(FAKE_ENV);
    const second = new DependencyContainer(FAKE_ENV);

    await first.greetingManager.execute(new SetGreetingRequest("only in first"));

    await expect(
      second.greetingManager.query(new GetGreetingRequest()),
    ).resolves.toMatchObject({
      greeting: DEFAULT_GREETING,
    });
  });
});
