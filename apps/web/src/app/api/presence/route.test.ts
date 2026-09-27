import { describe, expect, test } from "vitest";

import { POST } from "./route";

// Issue #81: the edge of presence through the server. Every case here is refused
// before the session is read; the signed-in paths run in e2e/presence.spec.ts.

function post(body: unknown, contentType = "application/json"): Request {
  return new Request("http://porchlight.test/api/presence", {
    method: "POST",
    headers: { "content-type": contentType },
    body: JSON.stringify(body),
  });
}

describe("POST /api/presence", () => {
  test("refuses a body that is not JSON by its content type", async () => {
    const response = await POST(
      post({ topic: "presence:site", signal: "join" }, "text/plain"),
    );
    expect(response.status).toBe(415);
  });

  test.each([
    { topic: "notifications:someone", signal: "join" },
    { topic: "presence:post:not-a-uuid", signal: "join" },
    { topic: "presence:site", signal: "shout" },
    { topic: "presence:site" },
    "presence:site",
  ])("refuses %j", async (body) => {
    const response = await POST(post(body));
    expect(response.status).toBe(400);
  });
});
