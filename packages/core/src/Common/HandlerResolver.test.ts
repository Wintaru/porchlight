import { describe, expect, test } from "vitest";

import { HandlerResolverBuilder } from "./HandlerResolverBuilder";
import type { IHandler } from "./IHandler";
import { RequestBase } from "./RequestBase";
import type { RequestContext } from "./RequestContext";
import { ResponseBase } from "./ResponseBase";
import { UnhandledRequestResponse } from "./UnhandledRequestResponse";

class PingRequest extends RequestBase {
  constructor(
    readonly payload: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}

class OtherRequest extends RequestBase {}

class PongResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly payload: string,
  ) {
    super(correlationId);
  }
}

class PingHandler implements IHandler<PingRequest, PongResponse> {
  handle(request: PingRequest): Promise<PongResponse> {
    return Promise.resolve(
      new PongResponse(request.correlationId, `pong:${request.payload}`),
    );
  }
}

const FIXED_CONTEXT: RequestContext = {
  correlationId: "00000000-0000-4000-8000-000000000001",
  timestamp: new Date("2026-09-11T00:00:00Z"),
};

describe("HandlerResolver", () => {
  const resolver = new HandlerResolverBuilder()
    .register(PingRequest, new PingHandler())
    .build();

  test("dispatches a request to the handler registered for its class", async () => {
    const response = await resolver.resolve(new PingRequest("hi", FIXED_CONTEXT));

    expect(response).toBeInstanceOf(PongResponse);
    expect(response).toMatchObject({
      correlationId: FIXED_CONTEXT.correlationId,
      payload: "pong:hi",
    });
  });

  test("answers a request with no handler with UnhandledRequestResponse", async () => {
    const response = await resolver.resolve(new OtherRequest(FIXED_CONTEXT));

    expect(response).toBeInstanceOf(UnhandledRequestResponse);
    expect(response).toMatchObject({
      correlationId: FIXED_CONTEXT.correlationId,
      requestType: "OtherRequest",
    });
  });

  test("an empty resolver handles nothing", async () => {
    const empty = new HandlerResolverBuilder().build();

    await expect(empty.resolve(new PingRequest("hi"))).resolves.toBeInstanceOf(
      UnhandledRequestResponse,
    );
  });
});

describe("HandlerResolverBuilder", () => {
  test("refuses a second handler for the same request class", () => {
    const builder = new HandlerResolverBuilder().register(PingRequest, new PingHandler());

    expect(() => builder.register(PingRequest, new PingHandler())).toThrow(
      "PingRequest already has a handler",
    );
  });

  test("a resolver does not change when the builder registers more after build", async () => {
    const builder = new HandlerResolverBuilder();
    const before = builder.build();
    builder.register(PingRequest, new PingHandler());

    await expect(before.resolve(new PingRequest("hi"))).resolves.toBeInstanceOf(
      UnhandledRequestResponse,
    );
  });
});

describe("RequestBase", () => {
  test("defaults a fresh correlation id and timestamp", () => {
    const first = new PingRequest("a");
    const second = new PingRequest("b");

    expect(first.correlationId).not.toBe(second.correlationId);
    expect(first.timestamp).toBeInstanceOf(Date);
  });

  test("keeps a supplied context", () => {
    const request = new PingRequest("a", FIXED_CONTEXT);

    expect(request.correlationId).toBe(FIXED_CONTEXT.correlationId);
    expect(request.timestamp).toBe(FIXED_CONTEXT.timestamp);
  });
});
