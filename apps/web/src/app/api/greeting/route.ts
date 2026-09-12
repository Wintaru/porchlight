import {
  GetGreetingRequest,
  GreetingResponse,
  GreetingUnavailableResponse,
  type RequestBase,
  type ResponseBase,
  SetGreetingRequest,
} from "@porchlight/core";

import { getDependencyContainer } from "@/lib/dependency-container";

// The example route from issue #2 and the template for every Client call into the core:
// validate the body at the edge, build a typed request, hand it to a Manager, narrow the
// response with `instanceof`, and map each response class to one HTTP status. GET and
// POST share this file on purpose: the fake accessor keeps its state on the module that
// wired it, and `next dev` can give separate route files separate module instances.

const MAX_GREETING_LENGTH = 200;

interface SetGreetingBody {
  readonly greeting: string;
}

// Parses and trims in one pass, so the length rule applies to what is stored.
function parseSetGreetingBody(value: unknown): SetGreetingBody | undefined {
  if (typeof value !== "object" || value === null || !("greeting" in value)) {
    return undefined;
  }
  const { greeting } = value;
  if (typeof greeting !== "string") {
    return undefined;
  }
  const trimmed = greeting.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_GREETING_LENGTH) {
    return undefined;
  }
  return { greeting: trimmed };
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

// A thrown error is the one outcome the response classes do not model: a handler or a
// real accessor's client failed in a way it did not expect. Log it with the correlation
// id and answer the same 500 shape, so the id in the response finds the log line.
async function dispatch(
  request: RequestBase,
  send: (request: RequestBase) => Promise<ResponseBase>,
): Promise<Response> {
  try {
    return toHttp(await send(request));
  } catch (error: unknown) {
    console.error(`greeting request failed [${request.correlationId}]`, error);
    return Response.json(
      { error: "Unexpected response.", correlationId: request.correlationId },
      { status: 500 },
    );
  }
}

function toHttp(response: ResponseBase): Response {
  if (response instanceof GreetingResponse) {
    return Response.json({
      greeting: response.greeting,
      correlationId: response.correlationId,
    });
  }
  if (response instanceof GreetingUnavailableResponse) {
    console.error(`greeting unavailable [${response.correlationId}]: ${response.reason}`);
    return Response.json(
      {
        error: "The greeting store is unavailable.",
        correlationId: response.correlationId,
      },
      { status: 503 },
    );
  }
  // UnhandledRequestResponse or a class this route does not know: a wiring bug.
  console.error(`unexpected ${response.constructor.name} [${response.correlationId}]`);
  return Response.json(
    { error: "Unexpected response.", correlationId: response.correlationId },
    { status: 500 },
  );
}

export function GET(): Promise<Response> {
  const { greetingManager } = getDependencyContainer();
  return dispatch(new GetGreetingRequest(), (request) => greetingManager.query(request));
}

export async function POST(request: Request): Promise<Response> {
  const body = parseSetGreetingBody(await readBody(request));
  if (body === undefined) {
    return Response.json(
      {
        error: `Body must be {"greeting": string}, 1 to ${String(MAX_GREETING_LENGTH)} characters.`,
      },
      { status: 400 },
    );
  }
  const { greetingManager } = getDependencyContainer();
  return dispatch(new SetGreetingRequest(body.greeting), (request) =>
    greetingManager.execute(request),
  );
}
